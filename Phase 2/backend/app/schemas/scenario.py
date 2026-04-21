from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PossibleAction(BaseModel):
    """One human action that can be taken on a scenario step."""

    action_id: str
    label: str
    description: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class StepAdvisorOutputTemplate(BaseModel):
    """Step-authored advisor content merged with advisor identity metadata."""

    advisor_id: str
    recommendation: str
    rationale: str
    confidence: float


class ScenarioStep(BaseModel):
    """Validated configuration for a single scenario step."""

    step_id: str
    phase: str = "decide"
    title: str
    context: str
    advisor_outputs: list[StepAdvisorOutputTemplate] = Field(default_factory=list)
    possible_actions: list[PossibleAction] = Field(default_factory=list)
    branching: dict[str, str] = Field(default_factory=dict)
    reflection_prompt: str
    reflection_enabled: bool = True
    step_metadata: dict[str, Any] = Field(default_factory=dict)


class ScenarioDefinition(BaseModel):
    """Full scenario definition loaded from disk."""

    scenario_id: str
    title: str
    description: str
    human_role: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    steps: list[ScenarioStep]


class ScenarioCatalogEntry(BaseModel):
    """Lightweight scenario descriptor returned by the scenario catalog endpoint."""

    scenario_id: str
    title: str
    description: str
    human_role: str
    step_count: int
    metadata: dict[str, Any] = Field(default_factory=dict)
