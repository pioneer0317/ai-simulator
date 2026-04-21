from __future__ import annotations

from pathlib import Path

import yaml

from app.schemas.scenario import ScenarioDefinition


class ScenarioLoader:
    """Load scenario definitions from YAML and expose them by scenario_id."""

    def __init__(self, scenario_dir: Path) -> None:
        self._scenario_dir = scenario_dir
        self._scenarios = self._load_scenarios()

    def _load_scenarios(self) -> dict[str, ScenarioDefinition]:
        """Read and validate all scenario YAML files in the configured directory."""
        scenarios: dict[str, ScenarioDefinition] = {}
        for path in sorted(self._scenario_dir.glob("*.yaml")):
            payload = yaml.safe_load(path.read_text(encoding="utf-8"))
            scenario = ScenarioDefinition.model_validate(payload)
            scenarios[scenario.scenario_id] = scenario
        return scenarios

    def get(self, scenario_id: str) -> ScenarioDefinition:
        """Return one scenario definition or raise if it is missing."""
        try:
            return self._scenarios[scenario_id]
        except KeyError as exc:
            raise KeyError(f"Scenario '{scenario_id}' was not found.") from exc

    def list(self) -> list[ScenarioDefinition]:
        """Return every loaded scenario in deterministic order."""
        return list(self._scenarios.values())
