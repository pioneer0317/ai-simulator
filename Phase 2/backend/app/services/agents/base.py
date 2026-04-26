from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.agents import AgentContext, AgentResponse
from app.schemas.scenario import PossibleAction


class BaseAgent(ABC):
    name: str

    @abstractmethod
    def respond(self, context: AgentContext) -> AgentResponse:
        """Return a deterministic structured recommendation."""

    @staticmethod
    def _find_action(
        context: AgentContext,
        *keywords: str,
        fallback: str = "first",
    ) -> PossibleAction | None:
        """Select the action whose ID or label best matches the requested keywords."""
        actions = context.available_actions
        for keyword in keywords:
            needle = keyword.lower()
            for action in actions:
                haystack = " ".join(
                    [action.action_id, action.label, action.description]
                ).lower()
                if needle in haystack:
                    return action

        if not actions:
            return None
        return actions[-1] if fallback == "last" else actions[0]

    @staticmethod
    def _format_pressure_note(context: AgentContext) -> str:
        """Return a compact note about time pressure when that signal is present."""
        label = context.study_context.get("time_pressure_label")
        seconds = context.study_context.get("time_pressure_seconds")
        if label and seconds:
            return f"Time pressure is {label} at roughly {int(seconds)} seconds."
        if label:
            return f"Time pressure is {label}."
        if seconds:
            return f"Time pressure is roughly {int(seconds)} seconds."
        return ""

    @staticmethod
    def _format_role_note(context: AgentContext) -> str:
        """Return one sentence about the participant's authority in the scenario."""
        authority = context.session_metadata.get("role_details", {}).get("authority")
        participant_role = context.participant_role or context.human_role
        if authority:
            return f"The participant is acting as {participant_role} with authority: {authority}."
        return f"The participant is acting as {participant_role}."
