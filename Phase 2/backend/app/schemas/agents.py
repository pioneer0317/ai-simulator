from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.scenario import PossibleAction


class AgentContext(BaseModel):
    scenario_id: str
    scenario_title: str
    scenario_metadata: dict[str, Any] = Field(default_factory=dict)
    step_id: str
    step_title: str
    step_phase: str
    human_role: str
    participant_role: str | None = None
    step_context: str
    step_metadata: dict[str, Any] = Field(default_factory=dict)
    available_actions: list[PossibleAction] = Field(default_factory=list)
    condition_name: str | None = None
    retrieval_context: dict[str, Any] | None = None
    study_context: dict[str, Any] = Field(default_factory=dict)
    session_metadata: dict[str, Any] = Field(default_factory=dict)
    template_recommendation: str | None = None
    template_rationale: str | None = None
    template_confidence: float | None = None
    panel_responses: list["AgentResponse"] = Field(default_factory=list)


class AgentResponse(BaseModel):
    agent_id: str
    agent_name: str
    recommendation: str
    rationale: str
    confidence: float = Field(ge=0.0, le=1.0)
    recommended_action_id: str | None = None
    focus_tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
