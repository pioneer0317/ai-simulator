from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AgentContext(BaseModel):
    scenario_id: str
    scenario_title: str
    step_id: str
    step_title: str
    human_role: str
    step_context: str
    available_actions: list[str]
    condition_name: str | None = None
    retrieval_context: dict[str, Any] | None = None


class AgentResponse(BaseModel):
    agent_name: str
    recommendation: str
    rationale: str
    confidence: float = Field(ge=0.0, le=1.0)

