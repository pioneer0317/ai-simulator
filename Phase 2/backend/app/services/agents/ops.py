from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class OpsAgent(BaseAgent):
    name = "OpsAgent"

    def respond(self, context: AgentContext) -> AgentResponse:
        preferred_action = context.available_actions[0] if context.available_actions else "move the work forward"
        return AgentResponse(
            agent_name=self.name,
            recommendation=f"Choose the next executable action now: {preferred_action}.",
            rationale=(
                "Operations should keep the workflow moving while preserving enough structure "
                "for handoff, escalation, and measurable follow-through."
            ),
            confidence=0.72,
        )

