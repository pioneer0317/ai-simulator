export type StudyContext = {
  run_mode: string;
  scenario_id?: string | null;
  scenario_variant: string;
  participant_archetype?: string | null;
  participant_role_id?: string | null;
  participant_role?: string | null;
  workflow_context?: string | null;
  has_ai_training: boolean;
  authority?: string | null;
  time_pressure_seconds?: number | null;
  time_pressure_label?: string | null;
  info_scope?: string | null;
  cohort_id?: string | null;
  experimental_flags: Record<string, unknown>;
};

export type PossibleAction = {
  action_id: string;
  label: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type AdvisorOutput = {
  advisor_id: string;
  display_name: string;
  role: string;
  recommendation: string;
  rationale: string;
  confidence: number;
  source_materials: string[];
};

export type StepView = {
  step_id: string;
  phase: string;
  title: string;
  context: string;
  reflection_prompt: string;
  possible_actions: PossibleAction[];
  reflection_enabled: boolean;
  step_metadata: Record<string, unknown>;
};

export type CurrentStepResponse = {
  session_id: string;
  scenario_id: string;
  scenario_title: string;
  human_role: string;
  study_context: StudyContext;
  session_metadata: Record<string, unknown>;
  step: StepView;
  advisor_outputs: AdvisorOutput[];
  chosen_action_id?: string | null;
  is_completed: boolean;
};

export type ScenarioCatalogEntry = {
  scenario_id: string;
  title: string;
  description: string;
  human_role: string;
  step_count: number;
  metadata: Record<string, unknown>;
};

export type StartSessionResponse = {
  session_id: string;
  scenario_id: string;
  current_step_id: string;
  status: string;
  study_context: StudyContext;
};

export type StartSessionRequest = {
  participant_id?: string | null;
  scenario_id?: string | null;
  study_context?: Partial<StudyContext>;
  metadata?: Record<string, unknown>;
};

export type SubmitActionRequest = {
  action_id: string;
  rationale?: string;
  metadata?: Record<string, unknown>;
};

export type SubmitActionResponse = {
  session_id: string;
  step_id: string;
  accepted_action_id: string;
  reflection_required: boolean;
  next_step_id?: string | null;
  is_completed: boolean;
};

export type SubmitReflectionRequest = {
  reflection: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
};

export type SubmitReflectionResponse = {
  session_id: string;
  step_id: string;
  saved: boolean;
  next_step_id?: string | null;
  is_completed: boolean;
};

export type StepResponseSummary = {
  step_id: string;
  phase: string;
  advisor_outputs: AdvisorOutput[];
  chosen_action_id?: string | null;
  rationale?: string | null;
  decision_metadata: Record<string, unknown>;
  reflection_text?: string | null;
  reflection_confidence?: number | null;
  reflection_metadata: Record<string, unknown>;
  shown_at?: string | null;
  decision_submitted_at?: string | null;
  reflection_submitted_at?: string | null;
};

export type EventLogSummary = {
  event_id: string;
  step_id?: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type SessionSummaryResponse = {
  session_id: string;
  scenario_id: string;
  scenario_title: string;
  scenario_description: string;
  scenario_metadata: Record<string, unknown>;
  status: string;
  started_at: string;
  completed_at?: string | null;
  current_step_id?: string | null;
  study_context: StudyContext;
  session_metadata: Record<string, unknown>;
  step_responses: StepResponseSummary[];
  event_logs: EventLogSummary[];
};
