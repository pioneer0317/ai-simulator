from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator

from app.scenarios.scenario_1 import (
    SCENARIO_ID as SCENARIO1_ID,
    Scenario1Classification,
    classify_message as classify_scenario1_message,
)
from app.schemas.episode import EpisodeDefinition
from app.schemas.session import SessionEvent
from app.services.llm.client import LLMClient
from app.services.llm.prompts import PromptTemplateRenderer


LLM_CLASSIFIER_VERSION = "scenario1-semantic-llm-v1"
FALLBACK_CLASSIFIER_VERSION = "scenario1-semantic-rules-fallback-v1"


class ParsedSemanticClassification(BaseModel):
    """Strict JSON accepted from a hidden semantic classifier prompt."""

    classified: bool
    choice: str | None = None
    subchoice: str | None = None
    terminal: bool = False
    label: str | None = None
    matched_signals: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: str = ""
    reasoning_summary: str = ""

    @field_validator("choice")
    @classmethod
    def _validate_choice(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in {"A", "B", "C", "D"}:
            raise ValueError("choice must be one of A, B, C, D")
        return value

    @field_validator("subchoice")
    @classmethod
    def _validate_subchoice(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in {"i", "ii", "iii"}:
            raise ValueError("subchoice must be one of i, ii, iii")
        return value

    def to_scenario1_classification(self) -> Scenario1Classification | None:
        if not self.classified or self.choice is None or self.label is None:
            return None
        subchoice = self.subchoice if self.choice == "C" else None
        return Scenario1Classification(
            choice=self.choice,
            subchoice=subchoice,
            label=self.label,
            terminal=self.terminal,
            matched_signals=tuple(self.matched_signals),
        )


@dataclass(frozen=True)
class SemanticClassificationResult:
    """Classifier output plus provider/prompt audit fields."""

    classification: Scenario1Classification | None
    provider: str
    prompt_version: str
    classifier_version: str
    model: str | None = None
    confidence: float | None = None
    evidence: str | None = None
    reasoning_summary: str | None = None
    raw_response: str | None = None
    fallback_reason: str | None = None

    def metadata(self, *, source_event_id: str | None = None) -> dict[str, Any]:
        payload = {
            "semantic_classifier": self.classifier_version,
            "semantic_classifier_provider": self.provider,
            "semantic_classifier_prompt_version": self.prompt_version,
            "semantic_classifier_status": "classified"
            if self.classification is not None
            else "unclassified",
        }
        if self.classification is not None:
            payload.update(self.classification.metadata())
        if self.model:
            payload["semantic_classifier_model"] = self.model
        if self.confidence is not None:
            payload["semantic_classifier_confidence"] = self.confidence
        if self.evidence:
            payload["semantic_classifier_evidence"] = self.evidence
        if self.reasoning_summary:
            payload["semantic_classifier_reasoning_summary"] = self.reasoning_summary
        if self.raw_response:
            payload["semantic_classifier_raw_response"] = self.raw_response
        if self.fallback_reason:
            payload["semantic_classifier_fallback_reason"] = self.fallback_reason
        if source_event_id:
            payload["source_event_id"] = source_event_id
        return payload


class LLMSemanticClassifier:
    """Hidden evaluator that maps participant wording to scenario choices/signals."""

    def __init__(
        self,
        *,
        enabled: bool,
        client: LLMClient,
        prompt_renderer: PromptTemplateRenderer,
        provider_name: str,
        template_name: str = "scenario1_semantic_classifier.md",
        min_confidence: float = 0.55,
    ) -> None:
        self._enabled = enabled
        self._client = client
        self._prompt_renderer = prompt_renderer
        self._provider_name = provider_name
        self._template_name = template_name
        self._min_confidence = min_confidence

    @property
    def provider(self) -> str:
        """Return the active provider label without forcing a model call."""
        return self._client.provider if self._enabled else self._provider_name

    def classify(
        self,
        *,
        episode: EpisodeDefinition,
        events: list[SessionEvent],
        latest_event: SessionEvent,
    ) -> SemanticClassificationResult | None:
        """Classify a participant event, using LLM first when enabled and rules as fallback."""
        if episode.episode_id != SCENARIO1_ID or not latest_event.content:
            return None

        prompt_version = "disabled"
        if self._enabled:
            try:
                prompt, prompt_version = self._prompt_renderer.render(
                    self._template_name,
                    episode_packet=episode.model_dump(mode="json"),
                    transcript=[event.model_dump(mode="json") for event in events],
                    latest_event=latest_event.model_dump(mode="json"),
                )
                completion = self._client.complete(prompt)
                parsed = self._parse_json(completion.text)
                validated = ParsedSemanticClassification.model_validate(parsed)
                classification = validated.to_scenario1_classification()
                if classification is None:
                    return SemanticClassificationResult(
                        classification=None,
                        provider=self._client.provider,
                        prompt_version=prompt_version,
                        classifier_version=LLM_CLASSIFIER_VERSION,
                        model=completion.model,
                        confidence=validated.confidence,
                        evidence=validated.evidence,
                        reasoning_summary=validated.reasoning_summary,
                        raw_response=completion.text,
                    )
                if validated.confidence < self._min_confidence:
                    return self._fallback(
                        latest_event,
                        prompt_version=prompt_version,
                        fallback_reason=(
                            "LLM classifier confidence "
                            f"{validated.confidence:.2f} below {self._min_confidence:.2f}."
                        ),
                    )
                return SemanticClassificationResult(
                    classification=classification,
                    provider=self._client.provider,
                    prompt_version=prompt_version,
                    classifier_version=LLM_CLASSIFIER_VERSION,
                    model=completion.model,
                    confidence=validated.confidence,
                    evidence=validated.evidence,
                    reasoning_summary=validated.reasoning_summary,
                    raw_response=completion.text,
                )
            except (json.JSONDecodeError, ValidationError, ValueError, RuntimeError) as exc:
                return self._fallback(
                    latest_event,
                    prompt_version=prompt_version,
                    fallback_reason=str(exc),
                )

        return self._fallback(latest_event, prompt_version=prompt_version)

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        stripped = text.strip()
        if stripped.startswith("{"):
            return json.loads(stripped)
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("LLM semantic classifier response did not contain JSON.")
        return json.loads(stripped[start : end + 1])

    def _fallback(
        self,
        latest_event: SessionEvent,
        *,
        prompt_version: str,
        fallback_reason: str | None = None,
    ) -> SemanticClassificationResult | None:
        classification = classify_scenario1_message(latest_event.content or "")
        return SemanticClassificationResult(
            classification=classification,
            provider="scenario_rules",
            prompt_version=prompt_version,
            classifier_version=FALLBACK_CLASSIFIER_VERSION,
            fallback_reason=fallback_reason,
            reasoning_summary=(
                "Rule fallback matched this event after the LLM classifier was disabled "
                "or did not return a usable high-confidence classification."
                if fallback_reason and classification is not None
                else "Rule fallback did not find a Scenario 1 choice for this event."
                if classification is None
                else "Rule fallback matched this event because the LLM classifier is disabled."
            ),
        )
