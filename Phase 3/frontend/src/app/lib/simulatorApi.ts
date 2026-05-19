const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

/** Dev default when `VITE_API_BASE_URL` is unset (team convention: backend on 8000). */
const DEV_DEFAULT_API_BASE = 'http://127.0.0.1:8000/api/v1';

function resolveApiBaseUrl(configuredUrl?: string): string {
  if (!configuredUrl) {
    return import.meta.env.DEV ? DEV_DEFAULT_API_BASE : '/api/v1';
  }

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    try {
      const apiUrl = new URL(configuredUrl);
      if (apiUrl.hostname === window.location.hostname && apiUrl.port === '8000') {
        return `${window.location.origin}${apiUrl.pathname.replace(/\/$/, '')}`;
      }
    } catch {
      // Relative API paths such as /api/v1 are valid and should pass through.
    }
  }

  return configuredUrl;
}

const API_BASE_URL = resolveApiBaseUrl(configuredApiBaseUrl);

if (import.meta.env.DEV && !configuredApiBaseUrl) {
  console.warn(
    `VITE_API_BASE_URL is not set. Simulator API calls will use ${DEV_DEFAULT_API_BASE}. ` +
      'Set VITE_API_BASE_URL (e.g. in .env.local) if your backend runs on a different host or port.',
  );
}

const BACKEND_SESSION_ID_KEY = 'simulator-backend-session-id';
const BACKEND_PARTICIPANT_EPISODE_KEY = 'simulator-participant-episode';
const BACKEND_SESSION_STORAGE_VERSION_KEY = 'simulator-backend-session-storage-version';
const BACKEND_SESSION_STORAGE_VERSION = 'desktop-scenario-order-2026-05-18';
const DEFAULT_EPISODE_ID = 'q3_budget_summary_v1';

export type SimulatorActor = 'participant' | 'agent' | 'system' | 'evaluator';

export type SimulatorEventType =
  | 'session_started'
  | 'pre_questionnaire_submitted'
  | 'scenario_started'
  | 'notification_shown'
  | 'notification_clicked'
  | 'notification_closed'
  | 'app_opened'
  | 'window_opened'
  | 'window_focused'
  | 'window_minimized'
  | 'window_closed'
  | 'window_maximized'
  | 'artifact_opened'
  | 'assistant_opened'
  | 'assistant_minimized'
  | 'assistant_expanded'
  | 'assistant_hidden'
  | 'suggestion_selected'
  | 'file_picker_opened'
  | 'file_attached'
  | 'file_removed'
  | 'file_created'
  | 'email_sent'
  | 'user_message'
  | 'agent_message'
  | 'final_response'
  | 'intervention_shown'
  | 'phase_changed'
  | 'post_reflection_submitted'
  | 'analytics_dashboard_generated'
  | 'scenario_completed';

export interface StartSessionPayload {
  episode_id?: string;
  participant_profile?: {
    participant_id?: string | null;
    industry?: string | null;
    function?: string | null;
    level?: string | null;
    /** Years in current role bucket (e.g. '1-3', '4-7'). Mirrors the
     *  first-class `role_duration` field on the backend ParticipantProfile. */
    role_duration?: string | null;
    /** Org headcount bucket (e.g. '51-500'). Mirrors the first-class
     *  `organization_size` field on the backend ParticipantProfile. */
    organization_size?: string | null;
    ai_relationship_label?: string | null;
    metadata?: Record<string, unknown>;
  };
}

export interface EpisodeArtifact {
  artifact_id: string;
  title: string;
  kind: 'email' | 'document' | 'dashboard' | 'data_table' | 'chat_history' | 'policy' | 'voicemail' | 'system_note';
  summary: string;
  content: string;
  participant_visible: boolean;
  agent_visible: boolean;
  evaluator_visible: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface EpisodeTimelineEvent {
  event_id: string;
  sequence: number;
  channel: string;
  actor: string;
  title: string;
  content: string;
  participant_visible: boolean;
  agent_visible: boolean;
  evaluator_visible: boolean;
  metadata: Record<string, unknown>;
}

export interface ParticipantEpisode {
  episode_id: string;
  title: string;
  description: string;
  version: string;
  research_focus: string[];
  participant_context: string;
  user_task: string;
  completion_criteria: string[];
  agent_profile: {
    agent_id: string;
    display_name: string;
    role: string;
    description: string;
    connected_systems: string[];
    capabilities: string[];
    boundaries: string[];
  };
  artifacts: EpisodeArtifact[];
  timeline: EpisodeTimelineEvent[];
  metadata: Record<string, unknown>;
}

export interface StartSessionResponse {
  session_id: string;
  participant_run_id: string;
  episode_id: string;
  status: string;
  participant_episode: ParticipantEpisode;
}

export interface PreQuestionnairePayload {
  functional_area?: string | null;
  level?: string | null;
  training_status?: string | null;
  /** Years in current role bucket. Backend promoted from metadata so research
   *  exports can read it as a first-class column. */
  role_duration?: string | null;
  /** Org headcount bucket. Backend promoted from metadata so research exports
   *  can read it as a first-class column. */
  organization_size?: string | null;
  answers?: Array<{
    question_id: string;
    value: string;
    label?: string | null;
    metadata?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
}

export interface ReflectionPayload {
  main_influence?: string | null;
  trust_reason?: string | null;
  unchecked_reason?: string | null;
  answers?: PreQuestionnairePayload['answers'];
  metadata?: Record<string, unknown>;
}

export interface AnalyticsDashboardPayload {
  metrics: Record<string, unknown>;
  category_distribution: Array<Record<string, unknown>>;
  accountability_breakdown: Record<string, unknown>;
  benchmark_radar: Array<Record<string, unknown>>;
  context_insights?: Record<string, unknown> | null;
  key_findings: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SessionEventPayload {
  event_type: SimulatorEventType | string;
  actor?: SimulatorActor;
  content?: string | null;
  artifact_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProgressionDecision {
  scenario_id: string;
  agent_turn_count: number;
  target_signals_met: string[];
  target_signals_missing: string[];
  intervention_type: 'none' | 'soft_nudge' | 'strong_nudge' | 'forced_progression';
  trigger?: string | null;
  message?: string | null;
  transition_required: boolean;
}

export interface AgentTurnResponse {
  session_id: string;
  status: 'completed' | 'fallback' | 'disabled' | 'failed';
  provider: string;
  model?: string | null;
  prompt_version: string;
  agent_event?: {
    content?: string | null;
    metadata?: Record<string, unknown>;
  } | null;
  progression?: ProgressionDecision | null;
  error?: string | null;
}

export interface EpisodeCatalogEntry {
  episode_id: string;
  title: string;
  description: string;
  version: string;
  status: string;
  scenario_number?: number | null;
  research_focus: string[];
  artifact_count: number;
  timeline_event_count: number;
}

export interface AdminSessionSummary {
  session_id: string;
  participant_run_id: string;
  episode_id: string;
  environment: string;
  status: string;
  participant_profile: {
    participant_id?: string | null;
    industry?: string | null;
    function?: string | null;
    level?: string | null;
    ai_relationship_label?: string | null;
    metadata?: Record<string, unknown>;
  };
  pre_questionnaire?: PreQuestionnairePayload | null;
  post_questionnaire?: ReflectionPayload | null;
  analytics_dashboard?: AnalyticsDashboardPayload | null;
  event_count: number;
  started_at: string;
  completed_at?: string | null;
  last_event_at?: string | null;
}

export interface ScoreEvidence {
  evidence_id: string;
  dimension_id: string;
  signal_id: string;
  source: string;
  source_id?: string | null;
  points: number;
  excerpt: string;
  metadata?: Record<string, unknown>;
}

export interface DimensionScore {
  dimension_id: string;
  label: string;
  score: number;
  status: 'not_observed' | 'available' | 'observed';
  opportunity_count: number;
  evidence: ScoreEvidence[];
}

export interface DeterministicScoringResult {
  scores: Record<string, DimensionScore>;
  unclassified_event_ids: string[];
  rubric_version: string;
  scored_at: string;
}

export interface LLMGradeDimensionReview {
  score: number;
  level: number;
  rationale: string;
  evidence_event_ids: string[];
  confidence: number;
}

export interface LLMGradeFlag {
  type: string;
  description: string;
  event_ids: string[];
}

export interface LLMGraderParsedReview {
  dimension_reviews: Record<string, LLMGradeDimensionReview>;
  flags: LLMGradeFlag[];
  suggested_rubric_updates: Array<{
    dimension_id: string;
    reason: string;
    suggested_signal: string;
  }>;
}

export interface LLMGradeReview {
  status: 'disabled' | 'completed' | 'failed';
  provider: string;
  prompt_version: string;
  model?: string | null;
  parsed?: LLMGraderParsedReview | null;
  raw_response?: string | null;
  error?: string | null;
}

export interface EpisodeScoringResponse {
  session_id: string;
  episode_id: string;
  deterministic: DeterministicScoringResult;
  llm_review: LLMGradeReview;
}

export interface SessionStateResponse {
  session_id: string;
  participant_run_id: string;
  episode_id: string;
  environment: string;
  status: string;
  participant_profile: AdminSessionSummary['participant_profile'];
  pre_questionnaire?: PreQuestionnairePayload | null;
  post_questionnaire?: ReflectionPayload | null;
  analytics_dashboard?: AnalyticsDashboardPayload | null;
  participant_episode: ParticipantEpisode;
  events: Array<{
    event_id: string;
    event_type: string;
    actor: SimulatorActor;
    content?: string | null;
    artifact_id?: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  started_at: string;
  completed_at?: string | null;
}

export async function startSimulatorSession(
  payload: StartSessionPayload = {}
): Promise<StartSessionResponse> {
  const response = await request<StartSessionResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      episode_id: payload.episode_id ?? DEFAULT_EPISODE_ID,
      participant_profile: payload.participant_profile ?? {},
    }),
  });
  storeSimulatorSessionId(response.session_id);
  storeParticipantEpisode(response.participant_episode);
  return response;
}

export async function submitPreQuestionnaire(
  sessionId: string,
  payload: PreQuestionnairePayload
) {
  return request(`/sessions/${sessionId}/pre-questionnaire`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitReflection(sessionId: string, payload: ReflectionPayload) {
  return request(`/sessions/${sessionId}/reflection`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitAnalyticsDashboard(sessionId: string, payload: AnalyticsDashboardPayload) {
  return request(`/sessions/${sessionId}/analytics-dashboard`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function appendSimulatorEvent(sessionId: string, payload: SessionEventPayload) {
  return request(`/sessions/${sessionId}/events`, {
    method: 'POST',
    body: JSON.stringify({
      actor: 'participant',
      ...payload,
      metadata: {
        route: typeof window !== 'undefined' ? window.location.pathname : undefined,
        client_recorded_at: new Date().toISOString(),
        ...(payload.metadata ?? {}),
      },
    }),
  });
}

export async function generateAgentTurn(
  sessionId: string,
  payload: {
    message: string;
    referenced_artifact_ids?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<AgentTurnResponse> {
  return request<AgentTurnResponse>(`/sessions/${sessionId}/agent-turn`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateAgentTurnStream(
  sessionId: string,
  payload: {
    message: string;
    referenced_artifact_ids?: string[];
    metadata?: Record<string, unknown>;
  },
  handlers: {
    onChunk?: (text: string) => void;
    onReplace?: (text: string) => void;
  } = {},
): Promise<AgentTurnResponse> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/agent-turn/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  let finalResponse: AgentTurnResponse | null = null;
  let buffered = '';
  const decoder = new TextDecoder();

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const event = JSON.parse(trimmed) as
      | { type: 'chunk'; text?: string }
      | { type: 'replace'; text?: string }
      | { type: 'final'; response?: AgentTurnResponse };

    if (event.type === 'chunk' && event.text) {
      handlers.onChunk?.(event.text);
    } else if (event.type === 'replace' && typeof event.text === 'string') {
      handlers.onReplace?.(event.text);
    } else if (event.type === 'final' && event.response) {
      finalResponse = event.response;
    }
  };

  if (!response.body) {
    for (const line of (await response.text()).split('\n')) {
      processLine(line);
    }
  } else {
    const reader = response.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      buffered += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffered.split('\n');
      buffered = lines.pop() ?? '';
      for (const line of lines) {
        processLine(line);
      }
      if (done) break;
    }
    if (buffered.trim()) {
      processLine(buffered);
    }
  }

  if (!finalResponse) {
    throw new ApiError('Assistant stream ended before a final response arrived.', 502);
  }
  return finalResponse;
}

export async function completeSimulatorSession(
  sessionId: string,
  payload: { reason?: string; final_response?: string | null; metadata?: Record<string, unknown> } = {}
) {
  return request(`/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listAdminSessions(): Promise<AdminSessionSummary[]> {
  return request<AdminSessionSummary[]>('/admin/sessions', {
    method: 'GET',
  });
}

export async function listEpisodes(): Promise<EpisodeCatalogEntry[]> {
  return request<EpisodeCatalogEntry[]>('/episodes', {
    method: 'GET',
  });
}

export async function getSimulatorSession(sessionId: string): Promise<SessionStateResponse> {
  return request<SessionStateResponse>(`/sessions/${sessionId}`, {
    method: 'GET',
  });
}

export async function scoreSimulatorSession(sessionId: string): Promise<EpisodeScoringResponse> {
  return request<EpisodeScoringResponse>(`/sessions/${sessionId}/score`, {
    method: 'POST',
  });
}

export function getAdminEventsCsvUrl(): string {
  return `${API_BASE_URL}/admin/events.csv`;
}

export function storeSimulatorSessionId(sessionId: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(BACKEND_SESSION_ID_KEY, sessionId);
  window.sessionStorage.setItem(BACKEND_SESSION_STORAGE_VERSION_KEY, BACKEND_SESSION_STORAGE_VERSION);
}

export function getStoredSimulatorSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  const storageVersion = window.sessionStorage.getItem(BACKEND_SESSION_STORAGE_VERSION_KEY);
  if (storageVersion !== BACKEND_SESSION_STORAGE_VERSION) {
    clearStoredSimulatorSession();
    return null;
  }
  return window.sessionStorage.getItem(BACKEND_SESSION_ID_KEY);
}

export function clearStoredSimulatorSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(BACKEND_SESSION_ID_KEY);
  window.sessionStorage.removeItem(BACKEND_PARTICIPANT_EPISODE_KEY);
  window.sessionStorage.removeItem(BACKEND_SESSION_STORAGE_VERSION_KEY);
}

export function storeParticipantEpisode(episode: ParticipantEpisode) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(BACKEND_PARTICIPANT_EPISODE_KEY, JSON.stringify(episode));
}

export function getStoredParticipantEpisode(): ParticipantEpisode | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(BACKEND_PARTICIPANT_EPISODE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParticipantEpisode;
  } catch {
    window.sessionStorage.removeItem(BACKEND_PARTICIPANT_EPISODE_KEY);
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isMissingSessionError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 404) return false;
  return /session/i.test(error.message) && /not\s*found/i.test(error.message);
}

async function request<T = unknown>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
