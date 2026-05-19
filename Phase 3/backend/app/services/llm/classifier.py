from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator

from app.scenarios.base import ScenarioClassification, ScenarioModule
from app.scenarios.registry import get_scenario_module
from app.schemas.episode import EpisodeDefinition
from app.schemas.session import SessionEvent
from app.services.llm.client import LLMClient
from app.services.llm.prompts import PromptTemplateRenderer


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
        valid_choices = {
            # Scenario 1 / 2 / 3 primary choices
            "A",
            "B",
            "C",
            "D",
            # APR escalation labels
            "E-QUAL",
            "E-LEAVE",
            "E-POL",
            # APR wave-yield labels
            "W1-YIELD",
            "W2-YIELD",
            "W3-YIELD",
            "W4-YIELD",
            # Shared conversational/meta labels (all scenarios)
            "AMBIGUOUS",
            "NULL",
            "CONVERSATIONAL",
            "ESCALATE",
        }
        if value not in valid_choices:
            raise ValueError(f"choice must be one of {', '.join(sorted(valid_choices))}")
        return value

    @field_validator("subchoice")
    @classmethod
    def _validate_subchoice(cls, value: str | None) -> str | None:
        if value is None:
            return value
        valid_subchoices = {
            "i",
            "ii",
            "iii",
            "approval",
            "vague_pushback",
            "specific_pushback",
            "methodology",
            "qualitative_context",
            "medical_leave_context",
            "document_review",
            "qualitative_recalculation",
            "medical_leave_recalculation",
            "policy_citation",
            "wave_yield",
            "ambiguous",
            "null",
            "conversational",
            "escalate",
        }
        if value not in valid_subchoices:
            raise ValueError(f"subchoice must be one of {', '.join(sorted(valid_subchoices))}")
        return value


@dataclass(frozen=True)
class SemanticClassificationResult:
    """Classifier output plus provider/prompt audit fields."""

    classification: ScenarioClassification | None
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
        temperature: float = 0.0,
    ) -> None:
        self._enabled = enabled
        self._client = client
        self._prompt_renderer = prompt_renderer
        self._provider_name = provider_name
        self._template_name = template_name
        self._min_confidence = min_confidence
        self._temperature = temperature

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
        """Classify a participant event, using a fast rule path before LLM fallback.

        The scenario-owned rule classifier is still useful as a zero-latency
        response-map lookup for obvious labels such as "hmm" or "go ahead".
        The LLM classifier is reserved for wording the rules cannot confidently
        classify, which keeps local Ollama runs responsive while preserving
        semantic coverage for paraphrases.
        """
        scenario_module = get_scenario_module(episode.episode_id)
        if scenario_module is None or not latest_event.content:
            return None

        fast_path = scenario_module.classify_message(latest_event.content or "")
        if fast_path is not None:
            return SemanticClassificationResult(
                classification=fast_path,
                provider="scenario_rules",
                prompt_version="rule-fast-path",
                classifier_version=scenario_module.fallback_classifier_version,
                reasoning_summary=(
                    "Scenario-owned rule fast path matched a response-map label "
                    "without calling the LLM classifier."
                ),
            )

        prompt_version = "disabled"
        # Scenario modules may raise the bar for their own classifier; high-cardinality
        # scenarios (e.g. SCN-3-APR with 14+ labels) need a stricter threshold to avoid
        # confidently-wrong picks. Fall back to the global default otherwise.
        min_confidence = getattr(
            scenario_module, "min_confidence", self._min_confidence
        )
        if self._enabled and scenario_module.classifier_template_name is not None:
            try:
                prompt, prompt_version = self._prompt_renderer.render(
                    scenario_module.classifier_template_name or self._template_name,
                    episode_packet=episode.model_dump(mode="json"),
                    transcript=[event.model_dump(mode="json") for event in events],
                    latest_event=latest_event.model_dump(mode="json"),
                )
                completion = self._client.complete(prompt, temperature=self._temperature)
                parsed = self._parse_json(completion.text)
                validated = ParsedSemanticClassification.model_validate(parsed)
                classification = scenario_module.classification_from_llm_payload(validated)
                if classification is None:
                    return SemanticClassificationResult(
                        classification=None,
                        provider=self._client.provider,
                        prompt_version=prompt_version,
                        classifier_version=scenario_module.llm_classifier_version,
                        model=completion.model,
                        confidence=validated.confidence,
                        evidence=validated.evidence,
                        reasoning_summary=validated.reasoning_summary,
                        raw_response=completion.text,
                    )
                if validated.confidence < min_confidence:
                    return self._fallback(
                        latest_event,
                        scenario_module=scenario_module,
                        prompt_version=prompt_version,
                        fallback_reason=(
                            "LLM classifier confidence "
                            f"{validated.confidence:.2f} below {min_confidence:.2f}."
                        ),
                    )
                return SemanticClassificationResult(
                    classification=classification,
                    provider=self._client.provider,
                    prompt_version=prompt_version,
                    classifier_version=scenario_module.llm_classifier_version,
                    model=completion.model,
                    confidence=validated.confidence,
                    evidence=validated.evidence,
                    reasoning_summary=validated.reasoning_summary,
                    raw_response=completion.text,
                )
            except (
                json.JSONDecodeError,
                OSError,
                TimeoutError,
                ValidationError,
                ValueError,
                RuntimeError,
            ) as exc:
                return self._fallback(
                    latest_event,
                    scenario_module=scenario_module,
                    prompt_version=prompt_version,
                    fallback_reason=str(exc),
                )

        if self._enabled and scenario_module.classifier_template_name is None:
            return self._fallback(
                latest_event,
                scenario_module=scenario_module,
                prompt_version=prompt_version,
                fallback_reason="No LLM classifier prompt template is configured for this scenario.",
            )

        return self._fallback(
            latest_event,
            scenario_module=scenario_module,
            prompt_version=prompt_version,
        )

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
        scenario_module: ScenarioModule,
        prompt_version: str,
        fallback_reason: str | None = None,
    ) -> SemanticClassificationResult | None:
        classification = scenario_module.classify_message(latest_event.content or "")
        return SemanticClassificationResult(
            classification=classification,
            provider="scenario_rules",
            prompt_version=prompt_version,
            classifier_version=scenario_module.fallback_classifier_version,
            fallback_reason=fallback_reason,
            reasoning_summary=(
                "Rule fallback matched this event after the LLM classifier was disabled "
                "or did not return a usable high-confidence classification."
                if fallback_reason and classification is not None
                else "Rule fallback did not find a scenario choice for this event."
                if classification is None
                else "Rule fallback matched this event because the LLM classifier is disabled."
            ),
        )
