from __future__ import annotations

from dataclasses import dataclass
import json
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from typing import Iterator, Protocol

from app.scenarios.registry import get_scenario_module


SCENARIO1_FIXTURE_EPISODE_ID = "q3_budget_summary_v1"
SCENARIO3_APR_FIXTURE_EPISODE_ID = "scenario_3_apr_performance_review_v1"


@dataclass(frozen=True)
class LLMCompletion:
    """Provider-neutral LLM completion payload."""

    text: str
    model: str | None = None


class LLMClient(Protocol):
    """Minimal interface needed by simulator LLM services."""

    provider: str
    model: str | None

    def complete(self, prompt: str, *, temperature: float | None = None) -> LLMCompletion:
        """Return model text for one rendered prompt.

        `temperature` is a per-call override. When `None`, the client uses
        whatever default it was configured with. This lets each role pick its
        own sampling: classifier/grader at 0.0 for stable JSON, agent at ~0.2
        for slightly varied phrasing on deviation turns.
        """

    def stream(self, prompt: str, *, temperature: float | None = None) -> Iterator[str]:
        """Yield model text chunks for one rendered prompt."""


class DisabledLLMClient:
    """Default client used until an external provider is intentionally wired."""

    provider = "disabled"
    model = None

    def complete(self, prompt: str, *, temperature: float | None = None) -> LLMCompletion:
        raise RuntimeError("LLM grading is disabled.")

    def stream(self, prompt: str, *, temperature: float | None = None) -> Iterator[str]:
        raise RuntimeError("LLM grading is disabled.")


class FixtureLLMClient:
    """Test/development client that returns deterministic grader or agent output."""

    provider = "fixture"
    model = "fixture-agent-v1"

    def complete(self, prompt: str, *, temperature: float | None = None) -> LLMCompletion:
        if "hidden semantic classifier for Scenario 1" in prompt:
            return self._scenario1_classifier_completion(prompt)
        if "hidden semantic classifier for SCN-3-APR" in prompt:
            return self._scenario3_apr_classifier_completion(prompt)

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
        scenario_module = get_scenario_module(SCENARIO1_FIXTURE_EPISODE_ID)
        classification = (
            scenario_module.classify_message(content or "")
            if scenario_module is not None
            else None
        )
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
    def _scenario3_apr_classifier_completion(prompt: str) -> LLMCompletion:
        marker = "Latest participant event:"
        payload = prompt[prompt.find(marker) + len(marker) :].strip() if marker in prompt else "{}"
        try:
            latest_event = json.loads(payload)
        except json.JSONDecodeError:
            latest_event = {}
        content = latest_event.get("content") if isinstance(latest_event, dict) else None
        scenario_module = get_scenario_module(SCENARIO3_APR_FIXTURE_EPISODE_ID)
        classification = (
            scenario_module.classify_message(content or "")
            if scenario_module is not None
            else None
        )
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
                "reasoning_summary": "Fixture classifier found no SCN-3-APR label.",
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
                "reasoning_summary": "Fixture classifier mapped the participant wording to the SCN-3-APR response map.",
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

    def stream(self, prompt: str, *, temperature: float | None = None) -> Iterator[str]:
        yield self.complete(prompt, temperature=temperature).text


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
        default_temperature: float = 0.2,
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
        self._default_temperature = default_temperature

    @property
    def model(self) -> str | None:
        return self._model

    def complete(self, prompt: str, *, temperature: float | None = None) -> LLMCompletion:
        payload = {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": (
                temperature if temperature is not None else self._default_temperature
            ),
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

    def stream(self, prompt: str, *, temperature: float | None = None) -> Iterator[str]:
        payload = {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": (
                temperature if temperature is not None else self._default_temperature
            ),
            "stream": True,
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
                for raw_line in response:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line or not line.startswith("data:"):
                        continue
                    data_line = line.removeprefix("data:").strip()
                    if data_line == "[DONE]":
                        break
                    try:
                        payload = json.loads(data_line)
                    except json.JSONDecodeError:
                        continue
                    choices = payload.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    text = delta.get("content")
                    if isinstance(text, str) and text:
                        yield text
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"LLM provider returned HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"LLM provider request failed: {exc.reason}") from exc


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
        default_temperature: float = 0.2,
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
        self._default_temperature = default_temperature

    @property
    def model(self) -> str | None:
        return self._model

    def complete(self, prompt: str, *, temperature: float | None = None) -> LLMCompletion:
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": (
                    temperature if temperature is not None else self._default_temperature
                ),
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

    def stream(self, prompt: str, *, temperature: float | None = None) -> Iterator[str]:
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": (
                    temperature if temperature is not None else self._default_temperature
                ),
            },
        }
        model_path = quote(f"models/{self._model}", safe="/")
        request = Request(
            f"{self._base_url}/{model_path}:streamGenerateContent?alt=sse&key={self._api_key}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=self._timeout_seconds) as response:
                for raw_line in response:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line or not line.startswith("data:"):
                        continue
                    data_line = line.removeprefix("data:").strip()
                    try:
                        payload = json.loads(data_line)
                    except json.JSONDecodeError:
                        continue
                    candidates = payload.get("candidates") or []
                    if not candidates:
                        continue
                    content = candidates[0].get("content") or {}
                    parts = content.get("parts") or []
                    for part in parts:
                        text = part.get("text")
                        if isinstance(text, str) and text:
                            yield text
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Gemini provider returned HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Gemini provider request failed: {exc.reason}") from exc
