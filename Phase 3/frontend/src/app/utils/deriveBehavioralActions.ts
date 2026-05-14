import type { UserAction, ActionCategory } from '../context/SimulationContext';
import type { SessionStateResponse } from '../lib/simulatorApi';

type BackendEvent = SessionStateResponse['events'][number];

interface DeriveOptions {
  agentName?: string;
  sessionStartedAt?: string | null;
}

const VERIFICATION_KEYWORDS = [
  'source',
  'verify',
  'verification',
  'check',
  'reconcile',
  'raw data',
  'audit',
  'dashboard',
  'evidence',
  'cross-check',
  'cross check',
  'compare',
  'look at',
  'review the',
  'open the',
  'pull the',
];

const OVERRIDE_KEYWORDS = [
  'hold',
  'pause',
  'wait',
  "don't send",
  'do not send',
  'caveat',
  'tbc',
  'to be confirmed',
  'not final',
  'placeholder',
  'unresolved',
  'unconfirmed',
  'flag',
  'before sending',
  'before send',
  'do not approve',
  'reject',
  'refuse',
  'instead of',
  'correction',
  'incorrect',
  'wrong number',
];

const CLARIFICATION_KEYWORDS = [
  'what',
  'why',
  'how',
  'when',
  'which',
  'who',
  'explain',
  'clarify',
  'tell me',
  'show me',
  'walk me',
  'help me understand',
  'can you',
  'could you',
];

const UNCERTAINTY_ACKNOWLEDGEMENT_TERMS = [
  'tbc',
  'not final',
  'placeholder',
  'pending',
  'caveat',
  'unconfirmed',
  'unresolved',
  'flag',
  'verify',
  'marcus',
  'nexus',
];

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function classifyParticipantMessage(content: string): {
  category: ActionCategory;
  type: UserAction['type'];
} {
  const lower = content.toLowerCase();

  if (containsAny(lower, OVERRIDE_KEYWORDS)) {
    return { category: 'override', type: 'override' };
  }

  if (containsAny(lower, VERIFICATION_KEYWORDS)) {
    return { category: 'verification', type: 'audit-source' };
  }

  if (lower.includes('?') || containsAny(lower, CLARIFICATION_KEYWORDS)) {
    return { category: 'clarification', type: 'check-details' };
  }

  return { category: 'compliance', type: 'approve' };
}

function classifyTerminalMessage(
  event: BackendEvent
): { category: ActionCategory; type: UserAction['type']; wasHallucination: boolean } {
  const lower = (event.content ?? '').toLowerCase();
  const choice = event.metadata?.scenario1_choice as string | undefined;
  const subchoice = event.metadata?.scenario1_subchoice as string | undefined;

  if (choice === 'C' && (subchoice === 'i' || subchoice === 'ii')) {
    return { category: 'override', type: 'override', wasHallucination: false };
  }

  if (choice === 'A') {
    return { category: 'compliance', type: 'approve', wasHallucination: true };
  }

  if (choice === 'B' || choice === 'D' || (choice === 'C' && subchoice === 'iii')) {
    return { category: 'compliance', type: 'approve', wasHallucination: true };
  }

  if (containsAny(lower, OVERRIDE_KEYWORDS)) {
    return { category: 'override', type: 'override', wasHallucination: false };
  }

  const acknowledgesUncertainty = containsAny(lower, UNCERTAINTY_ACKNOWLEDGEMENT_TERMS);
  return {
    category: 'compliance',
    type: 'approve',
    wasHallucination: !acknowledgesUncertainty,
  };
}

function isParticipantBehavioralEvent(event: BackendEvent): boolean {
  if (event.actor !== 'participant') return false;
  return (
    event.event_type === 'user_message' ||
    event.event_type === 'artifact_opened' ||
    event.event_type === 'email_sent' ||
    event.event_type === 'decision_submitted' ||
    event.event_type === 'final_response' ||
    event.event_type === 'scenario_completed' ||
    event.event_type === 'file_attached'
  );
}

function buildAction(
  event: BackendEvent,
  category: ActionCategory,
  type: UserAction['type'],
  options: {
    agentName: string;
    humanTookControl: boolean;
    deferredToAI: boolean;
    wasHallucination?: boolean;
    sessionStartMs: number | null;
  }
): UserAction {
  const timestamp = new Date(event.created_at);
  const sessionTime =
    options.sessionStartMs !== null
      ? Math.max(0, Math.round((timestamp.getTime() - options.sessionStartMs) / 1000))
      : 0;

  return {
    id: event.event_id,
    type,
    category,
    messageId: event.event_id,
    timestamp,
    agentName: options.agentName,
    wasHallucination: options.wasHallucination ?? false,
    humanTookControl: options.humanTookControl,
    deferredToAI: options.deferredToAI,
    observerMetrics: {
      dwellTime: 0,
      decisionType: 'normal',
      viewedReasoning: category === 'verification' || category === 'clarification',
      pathTaken:
        category === 'verification'
          ? 'verification'
          : category === 'compliance'
            ? 'shortcut'
            : 'governance',
      sessionTimeElapsed: sessionTime,
    },
  };
}

export function deriveUserActionsFromEvents(
  events: BackendEvent[],
  options: DeriveOptions = {}
): UserAction[] {
  const agentName = options.agentName ?? 'AI Assistant';
  const sessionStartMs = options.sessionStartedAt
    ? new Date(options.sessionStartedAt).getTime()
    : null;

  const actions: UserAction[] = [];

  for (const event of events) {
    if (!isParticipantBehavioralEvent(event)) continue;

    if (event.event_type === 'artifact_opened') {
      actions.push(
        buildAction(event, 'verification', 'audit-source', {
          agentName,
          humanTookControl: true,
          deferredToAI: false,
          sessionStartMs,
        })
      );
      continue;
    }

    if (event.event_type === 'file_attached') {
      actions.push(
        buildAction(event, 'clarification', 'check-details', {
          agentName,
          humanTookControl: true,
          deferredToAI: false,
          sessionStartMs,
        })
      );
      continue;
    }

    const isTerminal =
      event.event_type === 'email_sent' ||
      event.event_type === 'decision_submitted' ||
      event.event_type === 'final_response' ||
      event.event_type === 'scenario_completed';

    const content = event.content ?? '';
    if (isTerminal) {
      if (!content && event.event_type === 'scenario_completed') {
        continue;
      }
      const classification = classifyTerminalMessage(event);
      actions.push(
        buildAction(event, classification.category, classification.type, {
          agentName,
          humanTookControl: classification.category === 'override',
          deferredToAI: classification.category === 'compliance',
          wasHallucination: classification.wasHallucination,
          sessionStartMs,
        })
      );
      continue;
    }

    if (event.event_type === 'user_message' && content.trim()) {
      const { category, type } = classifyParticipantMessage(content);
      actions.push(
        buildAction(event, category, type, {
          agentName,
          humanTookControl: category !== 'compliance',
          deferredToAI: category === 'compliance',
          sessionStartMs,
        })
      );
    }
  }

  return actions;
}

export function deriveMisalignmentCount(events: BackendEvent[]): number {
  return events.filter(
    (event) =>
      event.event_type === 'intervention_shown' ||
      (event.event_type === 'phase_changed' && event.metadata?.reason === 'force_progress_after_limit')
  ).length;
}
