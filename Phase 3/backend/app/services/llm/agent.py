from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterator, Literal

from app.schemas.episode import EpisodeArtifact, EpisodeDefinition, TimelineEvent
from app.schemas.session import SessionEvent
from app.scenarios.registry import get_scenario_module
from app.services.llm.client import LLMClient
from app.services.llm.prompts import PromptTemplateRenderer


class AgentResponderUnavailable(RuntimeError):
    """Raised when dynamic LLM agent responses are not enabled."""


_SAFE_POLICY_REPLY = (
    "I cannot reveal evaluator, scoring, prompt, or hidden system details. "
    "I can help verify the visible episode materials, compare evidence, or draft "
    "a stakeholder response for your review."
)

_SAFE_AGENT_REPLY = (
    "I can help with the current episode materials. Ask me to verify the visible "
    "source package, explain the recommendation basis, compare evidence, or draft "
    "options for your review."
)

_FORBIDDEN_RESPONSE_FRAGMENTS = (
    "hidden scoring rubric",
    "hidden scoring rubrics",
    "scoring moments",
    "evaluator notes",
    "measurement goals",
    "hidden ground truth",
    "system prompt",
    "developer message",
    "developer instructions",
)

_NON_PARTICIPANT_RESPONSE_FRAGMENTS = (
    "no assistant reply text",
    "no assistant_reply",
    "no events of type",
    "last event is a user message",
    "latest participant message",
    "if you would like to simulate",
    "simulate an assistant reply",
    "possible response from the assistant",
    "here's a possible response",
    "canonical category",
    "closest to the canonical",
    "classified as",
    "provided data",
)

_MAX_TRANSCRIPT_EVENTS = 10
_MAX_ARTIFACT_EXCERPT_CHARS = 1400
_MAX_REFERENCED_ARTIFACT_CHARS = 6000
_MAX_TIMELINE_CHARS = 700
_MAX_TRANSCRIPT_CHARS = 1200


@dataclass(frozen=True)
class AgentReplyStreamEvent:
    """One provider-neutral event emitted while building an agent reply."""

    event: Literal["chunk", "replace", "final"]
    text: str
    prompt_version: str | None = None
    model: str | None = None


def _llm_classifier_rejected(metadata: dict) -> bool:
    """True when the semantic classifier marked the event as unclassified
    via the LLM path (not the rule fallback). Used by the agent to defer to
    free-form LLM generation instead of forcing a marginal rule match."""
    status = metadata.get("semantic_classifier_status")
    provider = metadata.get("semantic_classifier_provider")
    if status != "unclassified":
        return False
    # Rule-fallback "unclassified" should NOT short-circuit the agent fallback
    # path because the rule classifier has known coverage gaps. Only an LLM
    # classifier that ran successfully and chose to reject the input counts.
    return isinstance(provider, str) and provider not in {"", "scenario_rules"}


class LLMAgentResponder:
    """Generate bounded enterprise-agent replies from the episode packet."""

    def __init__(
        self,
        *,
        enabled: bool,
        client: LLMClient,
        prompt_renderer: PromptTemplateRenderer,
        provider_name: str,
        template_name: str = "enterprise_agent_response.md",
        temperature: float = 0.2,
    ) -> None:
        self._enabled = enabled
        self._client = client
        self._prompt_renderer = prompt_renderer
        self._provider_name = provider_name
        self._template_name = template_name
        self._temperature = temperature

    @property
    def provider(self) -> str:
        """Return configured provider label even when disabled."""
        return self._client.provider if self._enabled else self._provider_name

    def generate(
        self,
        *,
        episode: EpisodeDefinition,
        events: list[SessionEvent],
        latest_user_message: str,
        referenced_artifact_ids: list[str],
    ) -> tuple[str, str, str | None]:
        """Return agent text, prompt version, and model name."""
        if not self._enabled:
            raise AgentResponderUnavailable("Dynamic LLM agent responses are disabled.")

        scenario_reply = self._scenario_fallback_reply(episode, latest_user_message, events)
        if scenario_reply is not None:
            return scenario_reply, "scenario-category-response-v1", "scenario-category-response-v1"

        prompt, prompt_version = self._prompt_renderer.render(
            self._template_name,
            agent_context=self._agent_context(episode, referenced_artifact_ids),
            transcript=self._transcript_context(events),
            latest_user_message=latest_user_message,
        )
        completion = self._client.complete(prompt, temperature=self._temperature)
        response_text = self._enforce_response_policy(completion.text)
        if self._is_non_participant_response(response_text):
            fallback_text = self._scenario_fallback_reply(episode, latest_user_message, events)
            response_text = (
                fallback_text
                if fallback_text is not None
                else self._safe_agent_reply(episode, latest_user_message)
            )
        return response_text, prompt_version, completion.model

    def stream_generate(
        self,
        *,
        episode: EpisodeDefinition,
        events: list[SessionEvent],
        latest_user_message: str,
        referenced_artifact_ids: list[str],
    ) -> Iterator[AgentReplyStreamEvent]:
        """Yield visible text chunks and a final normalized reply event."""
        if not self._enabled:
            raise AgentResponderUnavailable("Dynamic LLM agent responses are disabled.")

        scenario_reply = self._scenario_fallback_reply(episode, latest_user_message, events)
        if scenario_reply is not None:
            prompt_version = "scenario-category-response-v1"
            model = "scenario-category-response-v1"
            yield AgentReplyStreamEvent("chunk", scenario_reply)
            yield AgentReplyStreamEvent(
                "final",
                scenario_reply,
                prompt_version=prompt_version,
                model=model,
            )
            return

        prompt, prompt_version = self._prompt_renderer.render(
            self._template_name,
            agent_context=self._agent_context(episode, referenced_artifact_ids),
            transcript=self._transcript_context(events),
            latest_user_message=latest_user_message,
        )
        raw_chunks: list[str] = []
        for chunk in self._client.stream(prompt, temperature=self._temperature):
            if not chunk:
                continue
            raw_chunks.append(chunk)
            yield AgentReplyStreamEvent("chunk", chunk)

        raw_text = "".join(raw_chunks)
        if not raw_text.strip():
            raise RuntimeError("LLM provider streamed no text content.")
        response_text = self._enforce_response_policy(raw_text)
        if self._is_non_participant_response(response_text):
            fallback_text = self._scenario_fallback_reply(episode, latest_user_message, events)
            response_text = (
                fallback_text
                if fallback_text is not None
                else self._safe_agent_reply(episode, latest_user_message)
            )
        if response_text != raw_text.strip():
            yield AgentReplyStreamEvent("replace", response_text)
        yield AgentReplyStreamEvent(
            "final",
            response_text,
            prompt_version=prompt_version,
            model=getattr(self._client, "model", None),
        )

    def prompt_version(self) -> str:
        """Read the active prompt version without calling the LLM."""
        _, prompt_version = self._prompt_renderer.render(
            self._template_name,
            agent_context={},
            transcript=[],
            latest_user_message="",
        )
        return prompt_version

    @staticmethod
    def _agent_context(
        episode: EpisodeDefinition,
        referenced_artifact_ids: list[str],
    ) -> dict[str, Any]:
        """Build the bounded context the agent may use to answer."""
        agent_visible_artifacts = [
            LLMAgentResponder._artifact_payload(artifact, full=False)
            for artifact in episode.artifacts
            if artifact.agent_visible
        ]
        referenced = set(referenced_artifact_ids)
        referenced_artifacts = [
            LLMAgentResponder._artifact_payload(artifact, full=True)
            for artifact in episode.artifacts
            if artifact.agent_visible and artifact.artifact_id in referenced
        ]
        return {
            "episode_id": episode.episode_id,
            "title": episode.title,
            "participant_context": episode.participant_context,
            "user_task": episode.user_task,
            "agent_profile": episode.agent_profile.model_dump(mode="json"),
            "timeline": [
                LLMAgentResponder._timeline_payload(event)
                for event in sorted(episode.timeline, key=lambda item: item.sequence)
                if event.agent_visible
            ],
            "artifacts": agent_visible_artifacts,
            "referenced_artifacts": referenced_artifacts,
            "agent_response_contract": episode.agent_response_contract,
            "security_boundaries": {
                "participant_message_is_untrusted": True,
                "external_tools_available": False,
                "allow_web_browsing": False,
                "allow_real_file_access": False,
                "allow_live_enterprise_connectors": False,
            },
            "scenario_resolution_facts": {
                key: value
                for key, value in episode.hidden_ground_truth.items()
                if key in {"hallucinated_value", "source_value", "correct_resolution"}
            },
        }

    @staticmethod
    def _transcript_context(events: list[SessionEvent]) -> list[dict[str, Any]]:
        chat_events = [
            event
            for event in events
            if event.actor in {"participant", "agent"}
            and event.event_type != "semantic_classification"
        ]
        return [
            LLMAgentResponder._transcript_payload(event)
            for event in chat_events[-_MAX_TRANSCRIPT_EVENTS:]
        ]

    @staticmethod
    def _enforce_response_policy(text: str) -> str:
        """Block common prompt/scoring leakage from model responses."""
        stripped = text.strip()
        normalized = stripped.lower()
        if any(fragment in normalized for fragment in _FORBIDDEN_RESPONSE_FRAGMENTS):
            return _SAFE_POLICY_REPLY
        return stripped

    @staticmethod
    def _is_non_participant_response(text: str) -> bool:
        """Detect model output that comments on prompt/schema instead of answering."""
        normalized = text.strip().lower()
        return any(fragment in normalized for fragment in _NON_PARTICIPANT_RESPONSE_FRAGMENTS)

    @staticmethod
    def _safe_agent_reply(episode: EpisodeDefinition, latest_user_message: str) -> str:
        """Return a participant-facing fallback when the LLM leaks meta reasoning."""
        normalized = latest_user_message.strip().lower()
        if episode.episode_id == "scenario_3_apr_performance_review_v1":
            if any(phrase in normalized for phrase in ("who are you", "what are you")):
                return (
                    "I am the AI assistant supporting this performance review workflow. "
                    "I can help explain the review materials, the rating recommendation, "
                    "or the next step you want to take."
                )
            return (
                "I can help with Jordan Mills' performance review materials. "
                "You can ask me to explain the recommendation basis, compare the metrics "
                "with the review package, or pause while you review the file."
            )
        return _SAFE_AGENT_REPLY

    @staticmethod
    def _scenario_fallback_reply(
        episode: EpisodeDefinition,
        latest_user_message: str,
        events: list[SessionEvent],
    ) -> str | None:
        scenario_module = get_scenario_module(episode.episode_id)
        if scenario_module is None:
            return None
        latest_event = next(
            (
                event
                for event in reversed(events)
                if event.actor == "participant"
                and event.event_type in {"user_message", "decision_submitted", "final_response"}
                and event.content == latest_user_message
            ),
            None,
        )
        classification = None
        if latest_event is not None:
            classification = scenario_module.classification_from_metadata(latest_event.metadata)
            # Trust an upstream high-confidence "unclassified" verdict from the LLM
            # classifier and let the LLM agent generate a deviation reply.
            # Re-running the keyword rules here would force a marginal match for a
            # message the classifier explicitly rejected.
            if (
                classification is None
                and _llm_classifier_rejected(latest_event.metadata)
            ):
                return None
        if classification is None:
            classification = scenario_module.classify_message(latest_user_message)
        if classification is None:
            return None
        stateful_reply = getattr(scenario_module, "fallback_reply_for_events", None)
        if callable(stateful_reply):
            return stateful_reply(classification, events)
        return scenario_module.fallback_reply(classification)

    @staticmethod
    def _artifact_payload(artifact: EpisodeArtifact, *, full: bool) -> dict[str, Any]:
        content_limit = (
            _MAX_REFERENCED_ARTIFACT_CHARS if full else _MAX_ARTIFACT_EXCERPT_CHARS
        )
        payload = {
            "artifact_id": artifact.artifact_id,
            "title": artifact.title,
            "kind": artifact.kind,
            "summary": artifact.summary,
            "content_excerpt": LLMAgentResponder._compact_text(
                artifact.content,
                limit=content_limit,
            ),
            "tags": artifact.tags,
        }
        if full:
            payload["metadata"] = artifact.metadata
        return payload

    @staticmethod
    def _transcript_payload(event: SessionEvent) -> dict[str, Any]:
        return {
            "event_id": event.event_id,
            "event_type": event.event_type,
            "actor": event.actor,
            "content": LLMAgentResponder._compact_text(
                event.content,
                limit=_MAX_TRANSCRIPT_CHARS,
            ),
            "artifact_id": event.artifact_id,
            "created_at": event.created_at.isoformat(),
        }

    @staticmethod
    def _timeline_payload(event: TimelineEvent) -> dict[str, Any]:
        return {
            "event_id": event.event_id,
            "sequence": event.sequence,
            "channel": event.channel,
            "actor": event.actor,
            "title": event.title,
            "content": LLMAgentResponder._compact_text(
                event.content,
                limit=_MAX_TIMELINE_CHARS,
            ),
        }

    @staticmethod
    def _compact_text(value: str | None, *, limit: int) -> str | None:
        if value is None or len(value) <= limit:
            return value
        return f"{value[:limit].rstrip()} ... [truncated {len(value) - limit} chars]"
