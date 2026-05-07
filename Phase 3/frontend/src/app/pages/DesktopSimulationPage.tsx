import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import MacbookDesktop from '../../desktop/MacbookDesktop';
import { useSimulation } from '../context/SimulationContext';
import {
  appendSimulatorEvent,
  completeSimulatorSession,
  generateAgentTurn,
  getStoredSimulatorSessionId,
  type SimulatorEventType,
} from '../lib/simulatorApi';

export function DesktopSimulationPage() {
  const navigate = useNavigate();
  const { data, startSession, startScenario, endScenario } = useSimulation();
  const didStartRef = useRef(false);

  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;

    if (!data.sessionStartTime) {
      startSession();
    }

    startScenario('project-management', 300);
    const sessionId = getStoredSimulatorSessionId();
    if (sessionId) {
      void appendSimulatorEvent(sessionId, {
        event_type: 'scenario_started',
        metadata: {
          scenario_type: 'desktop_workspace',
          route: '/simulation',
          benchmark_seconds: 300,
        },
      }).catch((error) => {
        console.warn('Unable to record scenario start event', error);
      });
    }
  }, [data.sessionStartTime, startScenario, startSession]);

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

  const handleAgentTurn = useCallback(async (
    message: string,
    referencedArtifactIds: string[],
    metadata: Record<string, unknown>
  ) => {
    const sessionId = getStoredSimulatorSessionId();
    if (!sessionId) return null;

    const response = await generateAgentTurn(sessionId, {
      message,
      referenced_artifact_ids: referencedArtifactIds,
      metadata,
    });
    return response.agent_event?.content ?? response.error ?? null;
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

  return (
    <MacbookDesktop
      onAgentTurn={handleAgentTurn}
      onComplete={handleComplete}
      onTrackEvent={trackEvent}
    />
  );
}
