from __future__ import annotations

from pathlib import Path

import yaml

from app.schemas.scenario import ScenarioDefinition, ScenarioStep


class ScenarioLoader:
    def __init__(self, scenario_dir: Path) -> None:
        """Point the loader at the scenario config directory and preload its files."""
        self._scenario_dir = scenario_dir
        # Load config files once into validated Python objects.
        self._scenarios = self._load_scenarios()

    def _load_scenarios(self) -> dict[str, ScenarioDefinition]:
        """Read every scenario YAML file and validate it into a ScenarioDefinition."""
        scenarios: dict[str, ScenarioDefinition] = {}
        for path in sorted(self._scenario_dir.glob("*.yaml")):
            payload = yaml.safe_load(path.read_text())
            scenario = ScenarioDefinition.model_validate(payload)
            scenarios[scenario.scenario_id] = scenario
        return scenarios

    def get(self, scenario_id: str) -> ScenarioDefinition:
        """Return one scenario definition by its scenario_id."""
        try:
            return self._scenarios[scenario_id]
        except KeyError as exc:
            raise KeyError(f"Scenario '{scenario_id}' was not found.") from exc


class ScenarioEngine:
    @staticmethod
    def get_first_step(scenario: ScenarioDefinition) -> ScenarioStep:
        """Return the first step in the scenario's ordered step list."""
        return scenario.steps[0]

    @staticmethod
    def get_step(scenario: ScenarioDefinition, step_id: str) -> ScenarioStep:
        """Find and return one step inside a scenario by step_id."""
        for step in scenario.steps:
            if step.step_id == step_id:
                return step
        raise KeyError(f"Step '{step_id}' was not found in scenario '{scenario.scenario_id}'.")

    @staticmethod
    def resolve_next_step(step: ScenarioStep, action_id: str) -> str | None:
        """Look up which step should follow the chosen action."""
        # The branching map is the state machine for phase 1.
        return step.branching.get(action_id)
