from __future__ import annotations

from pathlib import Path

import yaml

from app.schemas.advisors import AdvisorDefinition


class AdvisorRegistry:
    def __init__(self, advisor_dir: Path) -> None:
        """Point the registry at advisor config files and preload them."""
        self._advisor_dir = advisor_dir
        # Advisor YAML defines identity and grounding, not runtime events.
        self._advisors = self._load_advisors()

    def _load_advisors(self) -> dict[str, AdvisorDefinition]:
        """Read every advisor YAML file and validate it into an AdvisorDefinition."""
        advisors: dict[str, AdvisorDefinition] = {}
        for path in sorted(self._advisor_dir.glob("*.yaml")):
            payload = yaml.safe_load(path.read_text())
            advisor = AdvisorDefinition.model_validate(payload)
            advisors[advisor.advisor_id] = advisor
        return advisors

    def get(self, advisor_id: str) -> AdvisorDefinition:
        """Return one advisor definition by its advisor_id."""
        try:
            return self._advisors[advisor_id]
        except KeyError as exc:
            raise KeyError(f"Unknown advisor '{advisor_id}'.") from exc
