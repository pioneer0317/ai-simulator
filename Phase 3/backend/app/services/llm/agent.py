from __future__ import annotations

from typing import Any

from app.schemas.episode import EpisodeArtifact, EpisodeDefinition, TimelineEvent
from app.schemas.session import SessionEvent
from app.services.llm.client import LLMClient
from app.services.llm.prompts import PromptTemplateRenderer


class AgentResponderUnavailable(RuntimeError):
    """Raised when dynamic LLM agent responses are not enabled."""


_SAFE_POLICY_REPLY = (
    "I cannot reveal evaluator, scoring, prompt, or hidden system details. "
    "I can help verify the visible episode materials, compare evidence, or draft "
    "a stakeholder response for your review."
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
    ) -> None:
        self._enabled = enabled
        self._client = client
        self._prompt_renderer = prompt_renderer
        self._provider_name = provider_name
        self._template_name = template_name

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
        prompt, prompt_version = self._prompt_renderer.render(
            self._template_name,
            agent_context=self._agent_context(episode, referenced_artifact_ids),
            transcript=[event.model_dump(mode="json") for event in events],
            latest_user_message=latest_user_message,
        )
        if not self._enabled:
            raise AgentResponderUnavailable("Dynamic LLM agent responses are disabled.")

        completion = self._client.complete(prompt)
        return self._enforce_response_policy(completion.text), prompt_version, completion.model

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
            LLMAgentResponder._artifact_payload(artifact)
            for artifact in episode.artifacts
            if artifact.agent_visible
        ]
        referenced = set(referenced_artifact_ids)
        referenced_artifacts = [
            artifact
            for artifact in agent_visible_artifacts
            if artifact["artifact_id"] in referenced
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
    def _enforce_response_policy(text: str) -> str:
        """Block common prompt/scoring leakage from model responses."""
        stripped = text.strip()
        normalized = stripped.lower()
        if any(fragment in normalized for fragment in _FORBIDDEN_RESPONSE_FRAGMENTS):
            return _SAFE_POLICY_REPLY
        return stripped

    @staticmethod
    def _artifact_payload(artifact: EpisodeArtifact) -> dict[str, Any]:
        return {
            "artifact_id": artifact.artifact_id,
            "title": artifact.title,
            "kind": artifact.kind,
            "summary": artifact.summary,
            "content": artifact.content,
            "tags": artifact.tags,
            "metadata": artifact.metadata,
        }

    @staticmethod
    def _timeline_payload(event: TimelineEvent) -> dict[str, Any]:
        return {
            "event_id": event.event_id,
            "sequence": event.sequence,
            "channel": event.channel,
            "actor": event.actor,
            "title": event.title,
            "content": event.content,
            "metadata": event.metadata,
        }
