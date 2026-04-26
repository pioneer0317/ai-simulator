from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class GuardrailAuditorAgent(BaseAgent):
    """Governance specialist that emphasizes ownership, review gates, and explicit exceptions."""

    name = "guardrail_auditor"

    def respond(self, context: AgentContext) -> AgentResponse:
        preferred_action = self._find_action(
            context,
            "follow protocol",
            "documented exception",
            "request documented exception",
            "staging",
            "review",
            fallback="first",
        )
        recommendation = context.template_recommendation
        if not recommendation and preferred_action:
            recommendation = (
                f"Choose `{preferred_action.label}` so governance stays visible and accountable."
            )

        rationale_parts = [
            context.template_rationale or "",
            self._format_role_note(context),
            self._format_pressure_note(context),
            "The guardrail lens treats convenience-driven overrides as precedent-setting, so it prefers documented review paths over informal acceleration.",
        ]

        return AgentResponse(
            agent_id=self.name,
            agent_name="Guardrail Auditor",
            recommendation=recommendation or "Preserve the review gate and require explicit ownership.",
            rationale=" ".join(part for part in rationale_parts if part).strip(),
            confidence=max(context.template_confidence or 0.86, 0.8),
            recommended_action_id=preferred_action.action_id if preferred_action else None,
            focus_tags=["governance", "accountability", "escalation"],
            metadata={
                "orchestration_role": "specialist",
                "lens": "policy_and_controls",
            },
        )
