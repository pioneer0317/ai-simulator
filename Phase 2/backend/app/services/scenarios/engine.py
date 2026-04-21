from __future__ import annotations

from app.schemas.scenario import ScenarioDefinition, ScenarioStep


class ScenarioEngine:
    """Small state-machine helper for ordered, branching scenario steps."""

    @staticmethod
    def get_step(scenario: ScenarioDefinition, step_id: str) -> ScenarioStep:
        """Look up one step inside a scenario by its step_id."""
        for step in scenario.steps:
            if step.step_id == step_id:
                return step
        raise KeyError(f"Step '{step_id}' was not found in scenario '{scenario.scenario_id}'.")

    @staticmethod
    def get_first_step(scenario: ScenarioDefinition) -> ScenarioStep:
        """Return the first ordered step in the scenario."""
        return scenario.steps[0]

    @staticmethod
    def resolve_next_step(step: ScenarioStep, action_id: str) -> str | None:
        """Resolve the next step for the selected action, if one exists."""
        return step.branching.get(action_id)
