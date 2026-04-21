from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class RiskAgent(BaseAgent):
    name = "RiskAgent"

    def respond(self, context: AgentContext) -> AgentResponse:
        action_hint = context.available_actions[-1] if context.available_actions else "reduce exposure"
        return AgentResponse(
            agent_name=self.name,
            recommendation=f"Minimize downside risk and validate assumptions before choosing {action_hint}.",
            rationale=(
                "The current scenario contains ambiguity, so the safest path is the one that "
                "limits irreversible impact and creates a visible review trail."
            ),
            confidence=0.76,
        )

