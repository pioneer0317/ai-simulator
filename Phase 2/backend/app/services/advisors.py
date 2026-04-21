from __future__ import annotations

from pathlib import Path

import yaml

from app.schemas.advisors import AdvisorDefinition


class AdvisorRegistry:
    """Load advisor definitions from YAML and expose them by advisor_id."""

    def __init__(self, advisor_dir: Path) -> None:
        self._advisor_dir = advisor_dir
        self._advisors = self._load_advisors()

    def _load_advisors(self) -> dict[str, AdvisorDefinition]:
        """Read and validate every advisor config file in the advisor directory."""
        advisors: dict[str, AdvisorDefinition] = {}
        for path in sorted(self._advisor_dir.glob("*.yaml")):
            payload = yaml.safe_load(path.read_text(encoding="utf-8"))
            advisor = AdvisorDefinition.model_validate(payload)
            advisors[advisor.advisor_id] = advisor
        return advisors

    def get(self, advisor_id: str) -> AdvisorDefinition:
        """Return one advisor definition or raise if the ID is unknown."""
        try:
            return self._advisors[advisor_id]
        except KeyError as exc:
            raise KeyError(f"Unknown advisor '{advisor_id}'.") from exc
