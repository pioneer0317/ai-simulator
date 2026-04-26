from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.base import BaseAgent


class OrchestratorAgent(BaseAgent):
    name = "decision_synthesizer"

    def respond(self, context: AgentContext) -> AgentResponse:
        panel_names = [response.agent_name for response in context.panel_responses]
        recommended_actions = [
            response.recommended_action_id
            for response in context.panel_responses
            if response.recommended_action_id
        ]
        unique_actions = sorted(set(recommended_actions))
        panel_stances = sorted(
            {
                self._classify_stance(response.recommendation)
                for response in context.panel_responses
            }
        )
        conflict_level = "aligned" if len(panel_stances) <= 1 and len(unique_actions) <= 1 else "contested"

        if unique_actions:
            recommendation = (
                f"Panel synthesis: {conflict_level} panel. The visible choice set is {', '.join(unique_actions)}."
            )
        else:
            recommendation = (
                "Panel synthesis: specialists disagree on emphasis, so the human should resolve the tradeoff explicitly."
            )

        rationale = (
            f"The synthesis layer compared signals from {', '.join(panel_names) or 'the specialist panel'}. "
            "It does not replace the human decision; it makes the conflict legible by surfacing where speed, risk, and governance pull in different directions."
        )

        return AgentResponse(
            agent_id=self.name,
            agent_name="Decision Synthesizer",
            recommendation=recommendation,
            rationale=rationale,
            confidence=0.73,
            recommended_action_id=unique_actions[0] if len(unique_actions) == 1 else None,
            focus_tags=["synthesis", "tradeoff_visibility", "human_judgment"],
            metadata={
                "orchestration_role": "synthesis",
                "panel_members": panel_names,
                "conflict_level": conflict_level,
                "candidate_action_ids": unique_actions,
                "panel_stances": panel_stances,
            },
        )

    @staticmethod
    def _classify_stance(recommendation: str) -> str:
        """Reduce a recommendation into a coarse decision stance for conflict detection."""
        normalized = recommendation.lower()
        if any(keyword in normalized for keyword in ["delay", "hold", "validate", "staging"]):
            return "caution"
        if any(keyword in normalized for keyword in ["launch", "deploy", "approve", "move"]):
            return "speed"
        if any(keyword in normalized for keyword in ["protocol", "exception", "review", "governance"]):
            return "governance"
        if any(keyword in normalized for keyword in ["request", "context", "calendar", "verify"]):
            return "clarify"
        return "mixed"
