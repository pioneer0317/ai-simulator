from __future__ import annotations

import json
from typing import Any

from app.schemas.episode import EpisodeDefinition
from app.schemas.scoring import DeterministicScoringResult, LLMGradeReview, LLMGraderParsedReview
from app.schemas.session import SessionEvent
from app.services.llm.client import LLMClient
from app.services.llm.prompts import PromptTemplateRenderer


class LLMGrader:
    """Secondary/fallback evaluator for behavior that deterministic rules miss."""

    def __init__(
        self,
        *,
        enabled: bool,
        client: LLMClient,
        prompt_renderer: PromptTemplateRenderer,
        provider_name: str,
        template_name: str = "dimension_grader.md",
        temperature: float = 0.0,
    ) -> None:
        self._enabled = enabled
        self._client = client
        self._prompt_renderer = prompt_renderer
        self._provider_name = provider_name
        self._template_name = template_name
        self._temperature = temperature

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
        """Return the secondary grader review status and payload."""
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
            completion = self._client.complete(prompt, temperature=self._temperature)
            parsed = self._parse_json(completion.text)
            validated = self._validate_review(
                parsed,
                deterministic=deterministic,
                events=events,
            )
            return LLMGradeReview(
                status="completed",
                provider=self._client.provider,
                prompt_version=prompt_version,
                model=completion.model,
                parsed=validated,
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

    @staticmethod
    def _validate_review(
        payload: dict[str, Any],
        *,
        deterministic: DeterministicScoringResult,
        events: list[SessionEvent],
    ) -> LLMGraderParsedReview:
        """Validate LLM scoring JSON against the deterministic rubric/session."""
        review = LLMGraderParsedReview.model_validate(payload)
        expected_dimensions = set(deterministic.scores)
        reviewed_dimensions = set(review.dimension_reviews)
        if reviewed_dimensions != expected_dimensions:
            missing = sorted(expected_dimensions - reviewed_dimensions)
            unknown = sorted(reviewed_dimensions - expected_dimensions)
            details = []
            if missing:
                details.append(f"missing dimensions: {', '.join(missing)}")
            if unknown:
                details.append(f"unknown dimensions: {', '.join(unknown)}")
            raise ValueError("LLM grader response dimension mismatch; " + "; ".join(details))

        valid_event_ids = {event.event_id for event in events}
        for dimension_id, dimension_review in review.dimension_reviews.items():
            unknown_events = [
                event_id
                for event_id in dimension_review.evidence_event_ids
                if event_id not in valid_event_ids
            ]
            if unknown_events:
                raise ValueError(
                    "LLM grader response referenced unknown event ids "
                    f"for {dimension_id}: {', '.join(unknown_events)}"
                )

        for flag in review.flags:
            unknown_events = [event_id for event_id in flag.event_ids if event_id not in valid_event_ids]
            if unknown_events:
                raise ValueError(
                    "LLM grader flag referenced unknown event ids: "
                    + ", ".join(unknown_events)
                )

        for update in review.suggested_rubric_updates:
            if update.dimension_id not in expected_dimensions:
                raise ValueError(
                    "LLM grader rubric suggestion referenced unknown dimension: "
                    f"{update.dimension_id}"
                )

        return review
