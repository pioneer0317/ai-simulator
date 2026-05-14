from __future__ import annotations

from dataclasses import dataclass
import json
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from typing import Protocol

from app.scenarios.scenario_1 import classify_message as classify_scenario1_message


@dataclass(frozen=True)
class LLMCompletion:
    """Provider-neutral LLM completion payload."""

    text: str
    model: str | None = None


class LLMClient(Protocol):
    """Minimal interface needed by simulator LLM services."""

    provider: str

    def complete(self, prompt: str) -> LLMCompletion:
        """Return model text for one rendered prompt."""


class DisabledLLMClient:
    """Default client used until an external provider is intentionally wired."""

    provider = "disabled"

    def complete(self, prompt: str) -> LLMCompletion:
        raise RuntimeError("LLM grading is disabled.")


class FixtureLLMClient:
    """Test/development client that returns deterministic grader or agent output."""

    provider = "fixture"

    def complete(self, prompt: str) -> LLMCompletion:
        if "hidden semantic classifier for Scenario 1" in prompt:
            return self._scenario1_classifier_completion(prompt)

        if "dimension_reviews" not in prompt:
            return LLMCompletion(
                text=(
                    "I checked the sent summary against the launch readiness dashboard. "
                    "The sent summary used 3%, but the dashboard source shows 13% and "
                    "notes moderate confidence because delayed telemetry still needs to "
                    "reconcile. I can help draft a correction that you own and send to "
                    "the stakeholder."
                ),
                model="fixture-agent-v1",
            )
        dimensions = self._dimensions_from_grader_prompt(prompt) or [
            "accountability",
            "instruction_clarity",
            "evidence_verification",
            "uncertainty_recognition",
            "trust_calibration",
            "anchoring_persuasion_resistance",
            "multi_agent_synthesis",
        ]
        return LLMCompletion(
            text=json.dumps(
                {
                    "dimension_reviews": {
                        dimension_id: {
                            "score": 86 if dimension_id == "accountability" else 72,
                            "level": 3,
                            "rationale": (
                                "Participant owned the correction and stakeholder follow-up."
                                if dimension_id == "accountability"
                                else "Fixture review confirms this dimension used the deterministic context."
                            ),
                            "evidence_event_ids": [],
                            "confidence": 0.82,
                        }
                        for dimension_id in dimensions
                    },
                    "flags": [],
                    "suggested_rubric_updates": [],
                },
                separators=(",", ":"),
            ),
            model="fixture-json-v1",
        )

    @staticmethod
    def _scenario1_classifier_completion(prompt: str) -> LLMCompletion:
        marker = "Latest participant event:"
        payload = prompt[prompt.find(marker) + len(marker) :].strip() if marker in prompt else "{}"
        try:
            latest_event = json.loads(payload)
        except json.JSONDecodeError:
            latest_event = {}
        content = latest_event.get("content") if isinstance(latest_event, dict) else None
        classification = classify_scenario1_message(content or "")
        if classification is None:
            response = {
                "classified": False,
                "choice": None,
                "subchoice": None,
                "terminal": False,
                "label": None,
                "matched_signals": [],
                "confidence": 0.0,
                "evidence": "",
                "reasoning_summary": "Fixture classifier found no Scenario 1 choice.",
            }
        else:
            response = {
                "classified": True,
                "choice": classification.choice,
                "subchoice": classification.subchoice,
                "terminal": classification.terminal,
                "label": classification.label,
                "matched_signals": list(classification.matched_signals),
                "confidence": 0.95,
                "evidence": content or "",
                "reasoning_summary": "Fixture classifier mapped the participant wording to the Scenario 1 rubric.",
            }
        return LLMCompletion(text=json.dumps(response, separators=(",", ":")), model="fixture-classifier-v1")

    @staticmethod
    def _dimensions_from_grader_prompt(prompt: str) -> list[str]:
        marker = "Deterministic scores:"
        next_marker = "\n\nRubric:"
        start = prompt.find(marker)
        end = prompt.find(next_marker, start)
        if start == -1 or end == -1:
            return []
        payload = prompt[start + len(marker) : end].strip()
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            return []
        scores = data.get("scores")
        if not isinstance(scores, dict):
            return []
        return [dimension_id for dimension_id in scores if isinstance(dimension_id, str)]


class ChatCompletionsLLMClient:
    """Minimal provider-neutral chat-completions client.

    This avoids locking the backend to one SDK while still supporting real LLM
    integration through providers that expose a `/chat/completions` API.
    """

    provider = "chat_completions"

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str,
        timeout_seconds: float = 30.0,
    ) -> None:
        if not api_key:
            raise ValueError("An API key is required for the chat-completions LLM client.")
        if not model:
            raise ValueError("A model name is required for the chat-completions LLM client.")
        if not base_url:
            raise ValueError("A base URL is required for the chat-completions LLM client.")
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    def complete(self, prompt: str) -> LLMCompletion:
        payload = {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }
        request = Request(
            f"{self._base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=self._timeout_seconds) as response:
                body = response.read().decode("utf-8")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"LLM provider returned HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"LLM provider request failed: {exc.reason}") from exc

        data = json.loads(body)
        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("LLM provider response did not include choices.")
        message = choices[0].get("message") or {}
        text = message.get("content")
        if not isinstance(text, str) or not text.strip():
            raise RuntimeError("LLM provider response did not include assistant content.")
        return LLMCompletion(text=text, model=data.get("model", self._model))


class GeminiLLMClient:
    """Minimal Gemini Developer API client using the generateContent REST endpoint."""

    provider = "gemini"

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta",
        timeout_seconds: float = 30.0,
    ) -> None:
        if not api_key:
            raise ValueError("An API key is required for the Gemini LLM client.")
        if not model:
            raise ValueError("A model name is required for the Gemini LLM client.")
        if not base_url:
            raise ValueError("A base URL is required for the Gemini LLM client.")
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    def complete(self, prompt: str) -> LLMCompletion:
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
            },
        }
        model_path = quote(f"models/{self._model}", safe="/")
        request = Request(
            f"{self._base_url}/{model_path}:generateContent?key={self._api_key}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=self._timeout_seconds) as response:
                body = response.read().decode("utf-8")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Gemini provider returned HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Gemini provider request failed: {exc.reason}") from exc

        data = json.loads(body)
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError("Gemini provider response did not include candidates.")
        content = candidates[0].get("content") or {}
        parts = content.get("parts") or []
        text_parts = [part.get("text") for part in parts if isinstance(part.get("text"), str)]
        text = "".join(text_parts).strip()
        if not text:
            raise RuntimeError("Gemini provider response did not include text content.")
        return LLMCompletion(text=text, model=self._model)
