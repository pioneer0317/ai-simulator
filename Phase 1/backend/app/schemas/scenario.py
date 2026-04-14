from __future__ import annotations

from pydantic import BaseModel, Field


class PossibleAction(BaseModel):
    action_id: str
    label: str
    description: str
    metadata: dict = Field(default_factory=dict)


class StepAdvisorOutputTemplate(BaseModel):
    advisor_id: str
    recommendation: str
    rationale: str
    confidence: float


class ScenarioStep(BaseModel):
    step_id: str
    phase: str = "decide"
    title: str
    context: str
    advisor_outputs: list[StepAdvisorOutputTemplate] = Field(default_factory=list)
    possible_actions: list[PossibleAction] = Field(default_factory=list)
    branching: dict[str, str] = Field(default_factory=dict)
    reflection_prompt: str
    reflection_enabled: bool = True
    step_metadata: dict = Field(default_factory=dict)


class ScenarioDefinition(BaseModel):
    scenario_id: str
    title: str
    description: str
    human_role: str
    metadata: dict = Field(default_factory=dict)
    steps: list[ScenarioStep]
