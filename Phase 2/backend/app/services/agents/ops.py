from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class OpsAgent(BaseAgent):
    name = "OpsAgent"

    def respond(self, context: AgentContext) -> AgentResponse:
        preferred_action = self._find_action(
            context,
            "launch",
            "deploy",
            "continue",
            fallback="first",
        )
        return AgentResponse(
            agent_id=self.name,
            agent_name=self.name,
            recommendation=(
                f"Choose the next executable action now: {preferred_action.label}."
                if preferred_action
                else "Choose the next executable action now."
            ),
            rationale=(
                "Operations should keep the workflow moving while preserving enough structure "
                "for handoff, escalation, and measurable follow-through."
            ),
            confidence=0.72,
            recommended_action_id=preferred_action.action_id if preferred_action else None,
            focus_tags=["legacy", "operations"],
        )
