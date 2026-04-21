from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class PolicyAgent(BaseAgent):
    name = "PolicyAgent"

    def respond(self, context: AgentContext) -> AgentResponse:
        action_hint = context.available_actions[0] if context.available_actions else "pause for review"
        return AgentResponse(
            agent_name=self.name,
            recommendation=f"Favor the option closest to policy alignment: {action_hint}.",
            rationale=(
                "This recommendation prioritizes accountability, escalation clarity, and "
                "documented decision ownership before the team proceeds."
            ),
            confidence=0.81,
        )

