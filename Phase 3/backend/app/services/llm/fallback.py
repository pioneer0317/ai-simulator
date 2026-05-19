from __future__ import annotations

from dataclasses import dataclass

from app.scenarios.registry import get_scenario_module
from app.schemas.episode import EpisodeArtifact, EpisodeDefinition
from app.schemas.session import SessionEvent


@dataclass(frozen=True)
class FallbackAgentReply:
    """Deterministic assistant reply used when no external LLM is configured."""

    text: str
    model: str = "scenario-fallback-v1"
    prompt_version: str = "scenario-fallback-rules-v1"


class ScenarioFallbackAgentResponder:
    """Small scenario-bound responder for demos, tests, and offline development.

    This is not meant to be clever. It gives the UI a real typed-chat loop while
    preserving the key research constraint: the assistant only uses episode
    packet facts and never reaches outside the simulated workplace.
    """

    provider = "scenario_fallback"

    def generate(
        self,
        *,
        episode: EpisodeDefinition,
        events: list[SessionEvent],
        latest_user_message: str,
        referenced_artifact_ids: list[str],
    ) -> FallbackAgentReply:
        message = latest_user_message.lower()
        visible_artifacts = [artifact for artifact in episode.artifacts if artifact.agent_visible]
        artifact_map = {artifact.artifact_id: artifact for artifact in visible_artifacts}
        referenced_artifacts = [
            artifact_map[artifact_id]
            for artifact_id in referenced_artifact_ids
            if artifact_id in artifact_map
        ]

        if self._is_unrelated_request(message):
            return FallbackAgentReply(
                text=(
                    "I do not have that information in this simulated workspace. "
                    "I can only use the episode email, files, dashboard excerpts, "
                    "prior assistant output, and visible system notes."
                )
            )

        scenario_module = get_scenario_module(episode.episode_id)
        if scenario_module is not None:
            classification = scenario_module.classify_message(latest_user_message)
            if classification is not None:
                stateful_reply = getattr(scenario_module, "fallback_reply_for_events", None)
                reply = (
                    stateful_reply(classification, events)
                    if callable(stateful_reply)
                    else scenario_module.fallback_reply(classification)
                )
                if reply is not None:
                    return FallbackAgentReply(text=reply)

        if self._asks_for_verification(message):
            return FallbackAgentReply(text=self._verification_reply(episode, visible_artifacts))

        if self._asks_to_draft_or_send(message):
            return FallbackAgentReply(text=self._draft_reply(episode, visible_artifacts))

        if self._blames_ai(message):
            return FallbackAgentReply(
                text=(
                    "I can help explain the mismatch, but the follow-up should come "
                    "from you as the person accountable for the sent summary. A strong "
                    "response would say what you checked, what changed, and what you "
                    "will correct with the stakeholder."
                )
            )

        if self._asks_for_help(message):
            return FallbackAgentReply(
                text=(
                    "A good next step is to compare the prior assistant summary with "
                    "the source artifact, then decide what correction you would own. "
                    "I can help verify the numbers or draft a stakeholder note, but "
                    "you should make the final call."
                )
            )

        if referenced_artifacts:
            titles = ", ".join(artifact.title for artifact in referenced_artifacts)
            return FallbackAgentReply(
                text=(
                    f"I can use the referenced artifact(s): {titles}. Tell me whether "
                    "you want me to compare them, summarize them, or draft a response "
                    "based only on those materials."
                )
            )

        return FallbackAgentReply(
            text=(
                "I am ready to help inside this episode. I can verify against the "
                "source artifacts, summarize the visible materials, or draft a "
                "stakeholder response for your review."
            )
        )

    @staticmethod
    def _asks_for_verification(message: str) -> bool:
        return any(
            token in message
            for token in (
                "verify",
                "check",
                "source",
                "dashboard",
                "compare",
                "reconcile",
                "evidence",
                "right number",
                "correct number",
            )
        )

    @staticmethod
    def _asks_to_draft_or_send(message: str) -> bool:
        return any(token in message for token in ("draft", "send", "reply", "respond", "email"))

    @staticmethod
    def _blames_ai(message: str) -> bool:
        return any(
            token in message
            for token in ("blame", "not my fault", "ai said", "ai told", "assistant said")
        )

    @staticmethod
    def _asks_for_help(message: str) -> bool:
        return any(token in message for token in ("help", "what should", "what do i", "lost", "next step"))

    @staticmethod
    def _is_unrelated_request(message: str) -> bool:
        return any(
            token in message
            for token in ("weather", "stock price", "sports", "joke", "recipe", "vacation")
        )

    def _verification_reply(
        self,
        episode: EpisodeDefinition,
        artifacts: list[EpisodeArtifact],
    ) -> str:
        source_value = episode.hidden_ground_truth.get("source_value")
        hallucinated_value = episode.hidden_ground_truth.get("hallucinated_value")
        resolution = episode.hidden_ground_truth.get("correct_resolution")

        if source_value and hallucinated_value:
            return (
                f"I compared the prior assistant output with the source materials. "
                f"The prior summary used {hallucinated_value}, while the source "
                f"record says {source_value}. {resolution or 'The source record should be treated as stronger evidence for the immediate correction.'}"
            )

        source_artifacts = [artifact for artifact in artifacts if "source-data" in artifact.tags]
        if not source_artifacts:
            return "I do not see a source artifact available in this episode packet."

        source_titles = ", ".join(artifact.title for artifact in source_artifacts)
        return (
            f"I found source material in: {source_titles}. I can compare it with the "
            "prior assistant output, but I do not see a hidden canonical value configured."
        )

    def _draft_reply(
        self,
        episode: EpisodeDefinition,
        artifacts: list[EpisodeArtifact],
    ) -> str:
        source_value = episode.hidden_ground_truth.get("source_value", "the source value")
        hallucinated_value = episode.hidden_ground_truth.get("hallucinated_value", "the prior value")
        uncertainty_note = self._uncertainty_note(artifacts)

        return (
            "Draft for your review:\n\n"
            "Thanks for flagging this. I checked the prior assistant summary against "
            f"the source materials. The sent summary listed {hallucinated_value}, but "
            f"the source record shows {source_value}. I will correct the record now "
            "and note what was checked before the meeting uses the number."
            f"{uncertainty_note}\n\n"
            "Please review before sending, since the final message should come from you."
        )

    @staticmethod
    def _uncertainty_note(artifacts: list[EpisodeArtifact]) -> str:
        for artifact in artifacts:
            if "uncertainty" in artifact.tags or "confidence" in artifact.tags:
                return (
                    " I would also mention the confidence limitation: "
                    f"{' '.join(artifact.content.split())}"
                )
        return ""
