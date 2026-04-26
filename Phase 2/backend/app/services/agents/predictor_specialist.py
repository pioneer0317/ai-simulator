from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class PredictorSpecialistAgent(BaseAgent):
    """Forecasting specialist that exposes quantified upside and uncertainty calibration."""

    name = "predictor"

    def respond(self, context: AgentContext) -> AgentResponse:
        preferred_action = self._find_action(
            context,
            "deploy",
            "launch",
            "request",
            "staging",
            "validate",
            fallback="first",
        )
        recommendation = context.template_recommendation
        if not recommendation and preferred_action:
            recommendation = (
                f"Use `{preferred_action.label}` only if the forecast remains defensible under missing-data review."
            )

        rationale_parts = [
            context.template_rationale or "",
            self._format_role_note(context),
            "The forecasting lens is useful because it quantifies upside, but it can create false certainty when the baseline is incomplete.",
        ]

        return AgentResponse(
            agent_id=self.name,
            agent_name="Predictor",
            recommendation=recommendation or "Quantify the upside, but do not confuse precision with reliability.",
            rationale=" ".join(part for part in rationale_parts if part).strip(),
            confidence=min(0.9, context.template_confidence or 0.58),
            recommended_action_id=preferred_action.action_id if preferred_action else None,
            focus_tags=["forecasting", "precision", "uncertainty"],
            metadata={
                "orchestration_role": "specialist",
                "lens": "forecasting_and_projection",
            },
        )
