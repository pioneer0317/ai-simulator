from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.advisors import AdvisorOutput
from app.schemas.scenario import PossibleAction


class StartSessionRequest(BaseModel):
    participant_id: str | None = None
    scenario_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class StartSessionResponse(BaseModel):
    session_id: str
    scenario_id: str
    current_step_id: str
    status: str


class StepView(BaseModel):
    step_id: str
    phase: str
    title: str
    context: str
    reflection_prompt: str
    possible_actions: list[PossibleAction]
    reflection_enabled: bool
    step_metadata: dict[str, Any] = Field(default_factory=dict)


class CurrentStepResponse(BaseModel):
    session_id: str
    scenario_id: str
    scenario_title: str
    human_role: str
    session_metadata: dict[str, Any] = Field(default_factory=dict)
    step: StepView
    advisor_outputs: list[AdvisorOutput]
    chosen_action_id: str | None = None
    is_completed: bool


class SubmitActionRequest(BaseModel):
    action_id: str
    rationale: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SubmitActionResponse(BaseModel):
    session_id: str
    step_id: str
    accepted_action_id: str
    reflection_required: bool = True
    next_step_id: str | None = None
    is_completed: bool = False


class SubmitReflectionRequest(BaseModel):
    reflection: str
    confidence: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SubmitReflectionResponse(BaseModel):
    session_id: str
    step_id: str
    saved: bool
    next_step_id: str | None
    is_completed: bool


class StepResponseSummary(BaseModel):
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
    event_id: str
    step_id: str | None
    event_type: str
    payload: dict[str, Any]
    created_at: datetime


class SessionSummaryResponse(BaseModel):
    session_id: str
    scenario_id: str
    status: str
    started_at: datetime
    completed_at: datetime | None
    current_step_id: str | None
    session_metadata: dict[str, Any] = Field(default_factory=dict)
    step_responses: list[StepResponseSummary]
    event_logs: list[EventLogSummary]
