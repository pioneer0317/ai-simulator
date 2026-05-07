from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class PromptTemplateRenderer:
    """Render versioned prompt templates stored as backend assets."""

    def __init__(self, template_dir: Path) -> None:
        self._template_dir = Path(template_dir)

    def render(self, template_name: str, **values: Any) -> tuple[str, str]:
        """Return rendered prompt text and template version."""
        path = self._template_dir / template_name
        if not path.exists():
            raise FileNotFoundError(f"Prompt template was not found: {path}")
        template = path.read_text(encoding="utf-8")
        version = self._extract_version(template)
        rendered = template
        for key, value in values.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", self._stringify(value))
        return rendered, version

    @staticmethod
    def _extract_version(template: str) -> str:
        for line in template.splitlines():
            if line.lower().startswith("prompt-version:"):
                return line.split(":", 1)[1].strip()
        return "unversioned"

    @staticmethod
    def _stringify(value: Any) -> str:
        if isinstance(value, str):
            return value
        return json.dumps(value, indent=2, sort_keys=True, default=str)
