from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.episode import ParticipantEpisode


Actor = Literal["participant", "agent", "system", "evaluator"]


class ParticipantProfile(BaseModel):
    """Research metadata captured before the episode begins."""

    participant_id: str | None = None
    industry: str | None = None
    function: str | None = None
    level: str | None = None
    # Promoted from `metadata` so analytics can query without parsing JSON.
    # Older clients that send these values inside `metadata` continue to work
    # because both shapes round-trip through the same dict in storage.
    role_duration: str | None = None
    organization_size: str | None = None
    ai_relationship_label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class PreQuestionnaireAnswer(BaseModel):
    """One required baseline answer captured before the desktop episode."""

    question_id: str
    value: str
    label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class PreQuestionnaireSubmissionRequest(BaseModel):
    """Persist the pre-simulation questionnaire in the session timeline."""

    functional_area: str | None = None
    level: str | None = None
    training_status: str | None = None
    # Promoted from `metadata` so research exports can read role tenure and
    # organisation size as first-class columns. Optional with `None` defaults
    # so submissions that still tuck them into `metadata` keep working.
    role_duration: str | None = None
    organization_size: str | None = None
    answers: list[PreQuestionnaireAnswer] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReflectionSubmissionRequest(BaseModel):
    """Persist post-simulation motivation/reflection answers."""

    main_influence: str | None = None
    trust_reason: str | None = None
    unchecked_reason: str | None = None
    answers: list[PreQuestionnaireAnswer] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyticsDashboardSubmissionRequest(BaseModel):
    """Persist the participant-facing final analytics dashboard."""

    metrics: dict[str, Any] = Field(default_factory=dict)
    category_distribution: list[dict[str, Any]] = Field(default_factory=list)
    accountability_breakdown: dict[str, Any] = Field(default_factory=dict)
    benchmark_radar: list[dict[str, Any]] = Field(default_factory=list)
    context_insights: dict[str, Any] | None = None
    key_findings: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class CompleteSessionRequest(BaseModel):
    """Mark an episode session complete with optional final state metadata."""

    reason: str = "participant_completed"
    final_response: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class StartEpisodeSessionRequest(BaseModel):
    """Start a participant session for one simulator episode."""

    episode_id: str
    participant_profile: ParticipantProfile = Field(default_factory=ParticipantProfile)


class SessionEventCreateRequest(BaseModel):
    """Record one behavioral event from the simulation UI."""

    event_type: str
    actor: Actor = "participant"
    content: str | None = None
    artifact_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentTurnRequest(BaseModel):
    """Ask the bounded episode agent to respond to one participant message."""

    message: str
    referenced_artifact_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProgressionDecision(BaseModel):
    """Optional nudge or transition instruction returned after an agent turn."""

    scenario_id: str
    agent_turn_count: int
    target_signals_met: list[str] = Field(default_factory=list)
    target_signals_missing: list[str] = Field(default_factory=list)
    intervention_type: Literal["none", "soft_nudge", "strong_nudge", "forced_progression"] = "none"
    trigger: str | None = None
    message: str | None = None
    transition_required: bool = False


class SessionEvent(BaseModel):
    """Stored event in the participant session timeline."""

    event_id: str
    session_id: str
    episode_id: str
    event_type: str
    actor: Actor
    content: str | None = None
    artifact_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class StartEpisodeSessionResponse(BaseModel):
    """Return session identifiers plus the participant-safe episode packet."""

    session_id: str
    participant_run_id: str
    episode_id: str
    status: str
    participant_episode: ParticipantEpisode


class SessionEventResponse(BaseModel):
    """Return a just-recorded event."""

    session_id: str
    event: SessionEvent


class AgentTurnResponse(BaseModel):
    """Return the persisted user event and generated agent event for one turn."""

    session_id: str
    status: Literal["completed", "fallback", "disabled", "failed"]
    provider: str
    model: str | None = None
    prompt_version: str
    user_event: SessionEvent
    agent_event: SessionEvent | None = None
    progression: ProgressionDecision | None = None
    error: str | None = None


class SessionStateResponse(BaseModel):
    """Return the current persisted session state."""

    session_id: str
    participant_run_id: str
    episode_id: str
    environment: str
    status: str
    participant_profile: ParticipantProfile
    participant_episode: ParticipantEpisode
    pre_questionnaire: dict[str, Any] | None = None
    post_questionnaire: dict[str, Any] | None = None
    analytics_dashboard: dict[str, Any] | None = None
    events: list[SessionEvent]
    started_at: datetime
    completed_at: datetime | None = None


class AdminSessionSummary(BaseModel):
    """Compact session row for admin review dashboards."""

    session_id: str
    participant_run_id: str
    episode_id: str
    environment: str
    status: str
    participant_profile: ParticipantProfile
    pre_questionnaire: dict[str, Any] | None = None
    post_questionnaire: dict[str, Any] | None = None
    analytics_dashboard: dict[str, Any] | None = None
    event_count: int
    started_at: datetime
    completed_at: datetime | None = None
    last_event_at: datetime | None = None


class FrontendFlowResponse(BaseModel):
    """Describe the intended frontend route order for the combined app."""

    flow_id: str = "unified-desktop-flow"
    default_episode_id: str
    routes: list[dict[str, str]]
    backend_capabilities: dict[str, bool | str]
