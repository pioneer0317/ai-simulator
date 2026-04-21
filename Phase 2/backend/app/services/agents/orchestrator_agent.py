from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class OrchestratorAgent(BaseAgent):
    name = "OrchestratorAgent"

    def respond(self, context: AgentContext) -> AgentResponse:
        return AgentResponse(
            agent_name=self.name,
            recommendation="Balance policy, risk, and execution inputs before finalizing the human decision.",
            rationale=(
                "This agent acts as a lightweight synthesis layer and is the placeholder where "
                "future multi-agent coordination logic can be expanded."
            ),
            confidence=0.69,
        )

