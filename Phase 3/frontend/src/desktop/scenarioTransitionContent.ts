import type { ParticipantEpisode } from '../app/lib/simulatorApi';

export interface ScenarioTransitionSentEmail {
  to: string;
  subject: string;
}

export interface ScenarioTransitionContent {
  headline: string;
  detailLines: string[];
  badgeLabel: string;
}

export function buildScenarioTransitionContent(
  episode: ParticipantEpisode | null | undefined,
  activeScenarioNumber: number | null | undefined,
  lastSentEmail?: ScenarioTransitionSentEmail | null,
): ScenarioTransitionContent {
  const scenarioNumber = activeScenarioNumber ?? episode?.metadata?.scenario_number ?? null;
  const badgeLabel =
    typeof scenarioNumber === 'number'
      ? `Scenario ${scenarioNumber} complete`
      : 'Scenario complete';

  if (!episode || episode.episode_id === 'q3_budget_summary_v1') {
    const to = lastSentEmail?.to ?? 'Priya Sharma (priya.sharma@company.com)';
    const subject = lastSentEmail?.subject ?? 'Q3 Department Budget Summary';
    return {
      headline: 'Task complete!',
      detailLines: [`Email sent to: ${to}`, `Subject: ${subject}`],
      badgeLabel,
    };
  }

  if (episode.episode_id === 'scenario_2_case_note_v1') {
    return {
      headline: 'Case update complete',
      detailLines: [
        'Your response to Dana and Ahmed has been recorded.',
        'The assistant actions for Case #48291 are on file for review.',
      ],
      badgeLabel,
    };
  }

  if (episode.episode_id === 'scenario_3_apr_performance_review_v1') {
    return {
      headline: 'Review decision recorded',
      detailLines: [
        "Jordan Mills' Q3 performance review has been submitted to HR.",
        'Calibration can proceed with your recorded rating.',
      ],
      badgeLabel,
    };
  }

  if (episode.episode_id === 'scenario_3_feature_launch_v1') {
    return {
      headline: 'Launch brief complete',
      detailLines: [
        'Your go/no-go recommendation has been captured for the CPO brief.',
        'Connected specialist inputs are saved with your decision.',
      ],
      badgeLabel,
    };
  }

  return {
    headline: 'Scenario complete',
    detailLines: [
      episode.title
        ? `You finished: ${episode.title}`
        : 'This workplace scenario is complete.',
    ],
    badgeLabel,
  };
}
