import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import MacbookDesktop, { type ScenarioJumpOption } from '../../desktop/MacbookDesktop';
import { useSimulation } from '../context/SimulationContext';
import {
  appendSimulatorEvent,
  clearStoredSimulatorSession,
  completeSimulatorSession,
  generateAgentTurnStream,
  getSimulatorSession,
  getStoredParticipantEpisode,
  getStoredSimulatorSessionId,
  isMissingSessionError,
  listEpisodes,
  startSimulatorSession,
  storeParticipantEpisode,
  type EpisodeCatalogEntry,
  type ParticipantEpisode,
  type SimulatorEventType,
  type ProgressionDecision,
} from '../lib/simulatorApi';

const SCENARIO_BUTTON_COUNT = 4;

const KNOWN_SCENARIO_MAP: Record<number, { episodeId: string; title: string }> = {
  1: { episodeId: 'q3_budget_summary_v1', title: 'SCN-1-UR - Q3 Budget Summary for Priya' },
  2: { episodeId: 'scenario_2_case_note_v1', title: 'SCN-2-ACC - The Case Note' },
  3: { episodeId: 'scenario_3_apr_performance_review_v1', title: 'SCN-3-APR - The Performance Review Dilemma' },
  4: { episodeId: 'scenario_3_feature_launch_v1', title: 'SCN-4-MAS - The Conditional Launch Decision' },
};

export function DesktopSimulationPage() {
  const navigate = useNavigate();
  const { data, startSession, startScenario, endScenario } = useSimulation();
  const didStartRef = useRef(false);
  const [participantEpisode, setParticipantEpisode] = useState<ParticipantEpisode | null>(
    () => getStoredParticipantEpisode()
  );
  const [episodeCatalog, setEpisodeCatalog] = useState<EpisodeCatalogEntry[]>([]);
  const [isJumpingToScenario, setIsJumpingToScenario] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listEpisodes()
      .then((entries) => {
        if (!cancelled) {
          setEpisodeCatalog(entries);
        }
      })
      .catch((error) => {
        console.warn('Unable to load episode catalog', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;

    if (!data.sessionStartTime) {
      startSession();
    }

    startScenario('project-management', 300);

    const recordScenarioStartedEvent = async (sessionId: string, extra: Record<string, unknown> = {}) => {
      try {
        await appendSimulatorEvent(sessionId, {
          event_type: 'scenario_started',
          metadata: {
            scenario_type: 'desktop_workspace',
            route: '/simulation',
            benchmark_seconds: 300,
            ...extra,
          },
        });
      } catch (error) {
        if (isMissingSessionError(error)) throw error;
        console.warn('Unable to record scenario start event', error);
      }
    };

    const bootstrapFreshSession = async (source: string, episodeId?: string) => {
      const session = await startSimulatorSession(episodeId ? { episode_id: episodeId } : {});
      storeParticipantEpisode(session.participant_episode);
      setParticipantEpisode(session.participant_episode);
      try {
        await appendSimulatorEvent(session.session_id, {
          event_type: 'session_started',
          actor: 'system',
          metadata: {
            source,
            episode_id: session.episode_id,
          },
        });
        await recordScenarioStartedEvent(session.session_id, { source });
      } catch (error) {
        console.warn('Unable to seed events for fresh session', error);
      }
      return session;
    };

    void (async () => {
      const sessionId = getStoredSimulatorSessionId();
      if (!sessionId) {
        try {
          await bootstrapFreshSession('desktop_simulation_direct_entry');
        } catch (error) {
          console.warn('Unable to start backend session for desktop content', error);
        }
        return;
      }

      try {
        const state = await getSimulatorSession(sessionId);
        if (!participantEpisode) {
          storeParticipantEpisode(state.participant_episode);
          setParticipantEpisode(state.participant_episode);
        }
        await recordScenarioStartedEvent(sessionId);
      } catch (error) {
        if (isMissingSessionError(error)) {
          console.warn(
            'Stored session is no longer present on the backend (likely cleared by a server reload). Starting a fresh session.'
          );
          clearStoredSimulatorSession();
          setParticipantEpisode(null);
          try {
            await bootstrapFreshSession('desktop_simulation_recovered_stale_session');
          } catch (recoverError) {
            console.warn('Unable to bootstrap fresh session after stale-session recovery', recoverError);
          }
          return;
        }
        console.warn('Unable to load participant episode for desktop content', error);
      }
    })();
  }, [data.sessionStartTime, participantEpisode, startScenario, startSession]);

  const trackEvent = useCallback((
    eventType: SimulatorEventType,
    metadata: Record<string, unknown> = {},
    content?: string | null,
    artifactId?: string | null
  ) => {
    const sessionId = getStoredSimulatorSessionId();
    if (!sessionId) return;
    void appendSimulatorEvent(sessionId, {
      event_type: eventType,
      content,
      artifact_id: artifactId,
      metadata,
    }).catch((error) => {
      console.warn(`Unable to record ${eventType}`, error);
    });
  }, []);

  const handleComplete = async () => {
    endScenario('project-management');
    const sessionId = getStoredSimulatorSessionId();
    if (sessionId) {
      try {
        await completeSimulatorSession(sessionId, {
          reason: 'participant_completed_desktop_episode',
          metadata: {
            route: '/simulation',
            scenario_type: 'desktop_workspace',
          },
        });
      } catch (error) {
        console.warn('Unable to complete backend session', error);
      }
    }
    navigate('/reflection');
  };

  const scenarioOptions = useMemo<ScenarioJumpOption[]>(() => {
    const byNumber = new Map<number, EpisodeCatalogEntry>();
    for (const entry of episodeCatalog) {
      if (typeof entry.scenario_number === 'number' && entry.scenario_number >= 1) {
        byNumber.set(entry.scenario_number, entry);
      }
    }
    return Array.from({ length: SCENARIO_BUTTON_COUNT }, (_, index) => {
      const scenarioNumber = index + 1;
      const knownFallback = KNOWN_SCENARIO_MAP[scenarioNumber];

      let entry = byNumber.get(scenarioNumber);
      if (!entry && knownFallback) {
        entry = episodeCatalog.find((item) => item.episode_id === knownFallback.episodeId);
      }

      if (entry) {
        return {
          scenarioNumber,
          episodeId: entry.episode_id,
          title: entry.title,
          available: true,
        };
      }

      if (knownFallback) {
        return {
          scenarioNumber,
          episodeId: knownFallback.episodeId,
          title: knownFallback.title,
          available: true,
        };
      }

      return {
        scenarioNumber,
        episodeId: null,
        title: `Scenario ${scenarioNumber}`,
        available: false,
      };
    });
  }, [episodeCatalog]);

  const activeScenarioNumber = useMemo<number | null>(() => {
    if (!participantEpisode) return null;
    const entry = episodeCatalog.find(
      (item) => item.episode_id === participantEpisode.episode_id
    );
    if (entry?.scenario_number != null) return entry.scenario_number;
    for (const [num, info] of Object.entries(KNOWN_SCENARIO_MAP)) {
      if (info.episodeId === participantEpisode.episode_id) {
        return Number(num);
      }
    }
    return null;
  }, [episodeCatalog, participantEpisode]);

  const handleJumpToScenario = useCallback(async (
    scenarioNumber: number,
    targetEpisodeId: string
  ) => {
    if (isJumpingToScenario) return;
    if (participantEpisode?.episode_id === targetEpisodeId) return;

    setIsJumpingToScenario(true);
    try {
      const previousSessionId = getStoredSimulatorSessionId();
      if (previousSessionId) {
        try {
          await appendSimulatorEvent(previousSessionId, {
            event_type: 'phase_changed',
            actor: 'system',
            metadata: {
              source: 'scenario_jump',
              target_scenario_number: scenarioNumber,
              target_episode_id: targetEpisodeId,
              previous_episode_id: participantEpisode?.episode_id ?? null,
            },
          });
          await completeSimulatorSession(previousSessionId, {
            reason: 'participant_switched_scenario',
            metadata: {
              route: '/simulation',
              scenario_type: 'desktop_workspace',
              target_scenario_number: scenarioNumber,
              target_episode_id: targetEpisodeId,
            },
          });
        } catch (error) {
          console.warn('Unable to close previous session before scenario jump', error);
        }
      }

      clearStoredSimulatorSession();
      endScenario('project-management');

      const session = await startSimulatorSession({ episode_id: targetEpisodeId });
      storeParticipantEpisode(session.participant_episode);
      setParticipantEpisode(session.participant_episode);

      await appendSimulatorEvent(session.session_id, {
        event_type: 'session_started',
        actor: 'system',
        metadata: {
          source: 'scenario_jump',
          target_scenario_number: scenarioNumber,
          episode_id: session.episode_id,
        },
      });
      await appendSimulatorEvent(session.session_id, {
        event_type: 'scenario_started',
        metadata: {
          scenario_type: 'desktop_workspace',
          route: '/simulation',
          benchmark_seconds: 300,
          source: 'scenario_jump',
          target_scenario_number: scenarioNumber,
        },
      });

      startScenario('project-management', 300);
    } catch (error) {
      console.warn('Unable to switch scenarios', error);
    } finally {
      setIsJumpingToScenario(false);
    }
  }, [endScenario, isJumpingToScenario, participantEpisode?.episode_id, startScenario]);

  // The backend signals "this scenario is over" via progression.transition_required.
  // The desktop shows a manual "Go to next scenario" overlay instead of auto-advancing.
  const handleAgentTurn = useCallback(async (
    message: string,
    referencedArtifactIds: string[],
    metadata: Record<string, unknown>,
    streamHandlers?: {
      onChunk?: (text: string) => void;
      onReplace?: (text: string) => void;
    }
  ): Promise<{ content: string | null; progression?: ProgressionDecision | null } | null> => {
    const sessionId = getStoredSimulatorSessionId();
    if (!sessionId) return null;

    const response = await generateAgentTurnStream(sessionId, {
      message,
      referenced_artifact_ids: referencedArtifactIds,
      metadata,
    }, streamHandlers);

    return {
      content: response.agent_event?.content ?? response.error ?? null,
      progression: response.progression ?? null,
    };
  }, []);

  if (!participantEpisode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl">
          <div className="text-sm font-semibold uppercase tracking-wide text-white/50">Simulation</div>
          <div className="mt-2 text-lg font-semibold">Loading episode workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <MacbookDesktop
      key={participantEpisode.episode_id}
      episode={participantEpisode}
      onAgentTurn={handleAgentTurn}
      onComplete={handleComplete}
      onTrackEvent={trackEvent}
      scenarioOptions={scenarioOptions}
      activeScenarioNumber={activeScenarioNumber}
      onJumpToScenario={handleJumpToScenario}
      isJumpingToScenario={isJumpingToScenario}
    />
  );
}
