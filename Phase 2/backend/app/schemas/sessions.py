from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.schemas.advisors import AdvisorOutput
from app.schemas.scenario import PossibleAction


class StudyContext(BaseModel):
    """Structured metadata captured for research and experiment analysis."""

    run_mode: str = "test"
    scenario_id: str | None = None
    scenario_variant: str = "default"
    participant_archetype: str | None = None
    participant_role_id: str | None = None
    participant_role: str | None = None
    workflow_context: str | None = None
    has_ai_training: bool = False
    authority: str | None = None
    time_pressure_seconds: float | None = None
    time_pressure_label: str | None = None
    info_scope: str | None = None
    cohort_id: str | None = None
    experimental_flags: dict[str, Any] = Field(default_factory=dict)

    @field_validator("run_mode")
    @classmethod
    def _normalize_run_mode(cls, value: str) -> str:
        """Restrict run mode to the supported study modes."""
        normalized = value.lower().strip()
        if normalized not in {"test", "training"}:
            raise ValueError("run_mode must be either 'test' or 'training'.")
        return normalized

    @field_validator("time_pressure_label")
    @classmethod
    def _normalize_time_pressure_label(cls, value: str | None) -> str | None:
        """Validate optional time-pressure labels when they are supplied."""
        if value is None:
            return value
        normalized = value.lower().strip()
        if normalized not in {"low", "medium", "high"}:
            raise ValueError("time_pressure_label must be one of: low, medium, high.")
        return normalized


class StartSessionRequest(BaseModel):
    """Payload for creating a new scenario session."""

    participant_id: str | None = None
    scenario_id: str | None = None
    study_context: StudyContext = Field(default_factory=StudyContext)
    metadata: dict[str, Any] = Field(default_factory=dict)


class StartSessionResponse(BaseModel):
    """Response returned when a new session starts."""

    session_id: str
    scenario_id: str
    current_step_id: str
    status: str
    study_context: StudyContext


class StepView(BaseModel):
    """Frontend-safe representation of the current scenario step."""

    step_id: str
    phase: str
    title: str
    context: str
    reflection_prompt: str
    possible_actions: list[PossibleAction]
    reflection_enabled: bool
    step_metadata: dict[str, Any] = Field(default_factory=dict)


class CurrentStepResponse(BaseModel):
    """Everything the UI needs to render the current step."""

    session_id: str
    scenario_id: str
    scenario_title: str
    human_role: str
    study_context: StudyContext
    session_metadata: dict[str, Any] = Field(default_factory=dict)
    step: StepView
    advisor_outputs: list[AdvisorOutput]
    chosen_action_id: str | None = None
    is_completed: bool


class SubmitActionRequest(BaseModel):
    """Payload for recording a participant action."""

    action_id: str
    rationale: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SubmitActionResponse(BaseModel):
    """Result of storing a participant action."""

    session_id: str
    step_id: str
    accepted_action_id: str
    reflection_required: bool = True
    next_step_id: str | None = None
    is_completed: bool = False


class SubmitReflectionRequest(BaseModel):
    """Payload for storing post-decision reflection."""

    reflection: str
    confidence: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SubmitReflectionResponse(BaseModel):
    """Result of storing reflection and advancing the session."""

    session_id: str
    step_id: str
    saved: bool
    next_step_id: str | None
    is_completed: bool


class StepResponseSummary(BaseModel):
    """Flattened view of everything captured for one scenario step."""

    step_id: str
    phase: str
    advisor_outputs: list[AdvisorOutput]
    chosen_action_id: str | None
    rationale: str | None
    decision_metadata: dict[str, Any] = Field(default_factory=dict)
    reflection_text: str | None
    reflection_confidence: float | None
    reflection_metadata: dict[str, Any] = Field(default_factory=dict)
    shown_at: datetime | None
    decision_submitted_at: datetime | None
    reflection_submitted_at: datetime | None


class EventLogSummary(BaseModel):
    """Serializable event log row returned in session summaries."""

    event_id: str
    step_id: str | None
    event_type: str
    payload: dict[str, Any]
    created_at: datetime


class SessionSummaryResponse(BaseModel):
    """Aggregate session payload suitable for researcher review or export."""

    session_id: str
    scenario_id: str
    scenario_title: str
    scenario_description: str
    scenario_metadata: dict[str, Any] = Field(default_factory=dict)
    status: str
    started_at: datetime
    completed_at: datetime | None
    current_step_id: str | None
    study_context: StudyContext
    session_metadata: dict[str, Any] = Field(default_factory=dict)
    step_responses: list[StepResponseSummary]
    event_logs: list[EventLogSummary]
