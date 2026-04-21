from __future__ import annotations

from typing import Any


class RetrievalService:
    def get_step_context(
        self,
        *,
        session_id: str,
        scenario_id: str,
        step_id: str,
    ) -> dict[str, Any] | None:
        """Placeholder for future retrieval-augmented context."""
        return None

