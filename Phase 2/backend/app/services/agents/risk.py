from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class RiskAgent(BaseAgent):
    name = "RiskAgent"

    def respond(self, context: AgentContext) -> AgentResponse:
        action_hint = self._find_action(
            context,
            "delay",
            "validate",
            "escalate",
            "cross-check",
            fallback="last",
        )
        return AgentResponse(
            agent_id=self.name,
            agent_name=self.name,
            recommendation=(
                f"Minimize downside risk and validate assumptions before choosing {action_hint.label}."
                if action_hint
                else "Minimize downside risk and validate assumptions before acting."
            ),
            rationale=(
                "The current scenario contains ambiguity, so the safest path is the one that "
                "limits irreversible impact and creates a visible review trail."
            ),
            confidence=0.76,
            recommended_action_id=action_hint.action_id if action_hint else None,
            focus_tags=["legacy", "risk"],
        )
