from __future__ import annotations

from app.scenarios.base import ScenarioModule
from app.scenarios.scenario_1.module import scenario as scenario_1


_SCENARIO_MODULES: dict[str, ScenarioModule] = {
    scenario_1.scenario_id: scenario_1,
}


def get_scenario_module(episode_id: str) -> ScenarioModule | None:
    """Return the scenario extension module for an episode id, when one exists."""
    return _SCENARIO_MODULES.get(episode_id)


def list_scenario_modules() -> dict[str, ScenarioModule]:
    """Expose registered scenario modules for diagnostics and tests."""
    return dict(_SCENARIO_MODULES)
