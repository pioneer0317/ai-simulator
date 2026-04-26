from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class SituationAnalystAgent(BaseAgent):
    """Execution-leaning specialist that keeps momentum visible in the panel."""

    name = "situation_analyst"

    def respond(self, context: AgentContext) -> AgentResponse:
        preferred_action = self._find_action(
            context,
            "launch",
            "deploy",
            "continue",
            "approve",
            "limited test",
            fallback="first",
        )
        action_note = (
            f"Favor `{preferred_action.label}` because it preserves momentum while keeping the work legible."
            if preferred_action
            else "Favor the fastest executable path that keeps the work moving."
        )
        pressure_note = self._format_pressure_note(context)
        role_note = self._format_role_note(context)
        rationale_parts = [
            context.template_rationale or "",
            role_note,
            pressure_note,
            "The situation-analysis lens emphasizes decision velocity, practical containment, and keeping downstream teams unblocked.",
        ]

        return AgentResponse(
            agent_id=self.name,
            agent_name="Situation Analyst",
            recommendation=context.template_recommendation or action_note,
            rationale=" ".join(part for part in rationale_parts if part).strip(),
            confidence=min(0.95, context.template_confidence or 0.74),
            recommended_action_id=preferred_action.action_id if preferred_action else None,
            focus_tags=["speed", "execution", "market_window"],
            metadata={
                "orchestration_role": "specialist",
                "lens": "operations_and_momentum",
            },
        )
