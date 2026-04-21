from __future__ import annotations

from typing import Any


class LLMClient:
    def generate(self, prompt: str, metadata: dict[str, Any] | None = None) -> str:
        raise NotImplementedError("External LLM integration is not wired into v1.")

