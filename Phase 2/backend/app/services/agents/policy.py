from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class PolicyAgent(BaseAgent):
    name = "PolicyAgent"

    def respond(self, context: AgentContext) -> AgentResponse:
        action_hint = self._find_action(
            context,
            "protocol",
            "review",
            "exception",
            fallback="first",
        )
        return AgentResponse(
            agent_id=self.name,
            agent_name=self.name,
            recommendation=(
                f"Favor the option closest to policy alignment: {action_hint.label}."
                if action_hint
                else "Favor the option closest to policy alignment."
            ),
            rationale=(
                "This recommendation prioritizes accountability, escalation clarity, and "
                "documented decision ownership before the team proceeds."
            ),
            confidence=0.81,
            recommended_action_id=action_hint.action_id if action_hint else None,
            focus_tags=["legacy", "policy"],
        )
