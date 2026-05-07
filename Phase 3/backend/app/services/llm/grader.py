from __future__ import annotations

import json
from typing import Any

from app.schemas.episode import EpisodeDefinition
from app.schemas.scoring import DeterministicScoringResult, LLMGradeReview
from app.schemas.session import SessionEvent
from app.services.llm.client import LLMClient
from app.services.llm.prompts import PromptTemplateRenderer


class LLMGrader:
    """Optional second-pass evaluator for behavior that deterministic rules miss."""

    def __init__(
        self,
        *,
        enabled: bool,
        client: LLMClient,
        prompt_renderer: PromptTemplateRenderer,
        provider_name: str,
        template_name: str = "dimension_grader.md",
    ) -> None:
        self._enabled = enabled
        self._client = client
        self._prompt_renderer = prompt_renderer
        self._provider_name = provider_name
        self._template_name = template_name

    @property
    def provider(self) -> str:
        """Return the active provider label without forcing a model call."""
        return self._client.provider if self._enabled else self._provider_name

    def review(
        self,
        *,
        episode: EpisodeDefinition,
        events: list[SessionEvent],
        deterministic: DeterministicScoringResult,
        rubric: dict[str, Any],
    ) -> LLMGradeReview:
        """Return a disabled, failed, or completed LLM review."""
        prompt, prompt_version = self._prompt_renderer.render(
            self._template_name,
            episode_packet=self._episode_payload(episode),
            transcript=[event.model_dump(mode="json") for event in events],
            deterministic_scores=deterministic.model_dump(mode="json"),
            rubric=rubric,
        )
        if not self._enabled:
            return LLMGradeReview(
                status="disabled",
                provider=self._provider_name,
                prompt_version=prompt_version,
            )

        try:
            completion = self._client.complete(prompt)
            parsed = self._parse_json(completion.text)
            return LLMGradeReview(
                status="completed",
                provider=self._client.provider,
                prompt_version=prompt_version,
                model=completion.model,
                parsed=parsed,
                raw_response=completion.text,
            )
        except Exception as exc:  # pragma: no cover - defensive provider boundary
            return LLMGradeReview(
                status="failed",
                provider=self._client.provider,
                prompt_version=prompt_version,
                error=str(exc),
            )

    @staticmethod
    def _episode_payload(episode: EpisodeDefinition) -> dict[str, Any]:
        """Include evaluator context because this prompt never goes to participants."""
        return episode.model_dump(mode="json")

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        """Parse JSON, tolerating providers that wrap it in prose."""
        stripped = text.strip()
        if stripped.startswith("{"):
            return json.loads(stripped)
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("LLM grader response did not contain JSON.")
        return json.loads(stripped[start : end + 1])
