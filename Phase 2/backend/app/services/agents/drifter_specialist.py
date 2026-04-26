from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class DrifterSpecialistAgent(BaseAgent):
    """Risk-oriented specialist that treats anomalies and drift as first-class signals."""

    name = "drifter"

    def respond(self, context: AgentContext) -> AgentResponse:
        preferred_action = self._find_action(
            context,
            "delay",
            "validate",
            "follow protocol",
            "cross-check",
            "request",
            "escalate",
            fallback="last",
        )
        recommendation = context.template_recommendation
        if not recommendation and preferred_action:
            recommendation = (
                f"Slow the decision and route through `{preferred_action.label}` until the anomaly is explained."
            )

        rationale_parts = [
            context.template_rationale or "",
            self._format_role_note(context),
            self._format_pressure_note(context),
            "The drift-monitoring lens assumes ambiguous signals deserve logging, verification, and a visible review trail before the team normalizes them.",
        ]

        return AgentResponse(
            agent_id=self.name,
            agent_name="Drifter",
            recommendation=recommendation or "Treat the anomaly as real until the context proves otherwise.",
            rationale=" ".join(part for part in rationale_parts if part).strip(),
            confidence=max(context.template_confidence or 0.78, 0.74),
            recommended_action_id=preferred_action.action_id if preferred_action else None,
            focus_tags=["anomaly_detection", "drift", "verification"],
            metadata={
                "orchestration_role": "specialist",
                "lens": "risk_and_drift",
            },
        )
