from __future__ import annotations

from typing import Any

from app.schemas.advisors import AdvisorOutput
from app.schemas.agents import AgentContext, AgentResponse
from app.schemas.scenario import ScenarioDefinition, ScenarioStep, StepAdvisorOutputTemplate
from app.schemas.sessions import StudyContext
from app.services.advisors import AdvisorRegistry
from app.services.agents.runner import AgentRunner


class MultiAgentWorkflow:
    """Compose specialist panel outputs plus one bounded synthesis layer."""

    def __init__(self, *, runner: AgentRunner, advisor_registry: AdvisorRegistry) -> None:
        self._runner = runner
        self._advisor_registry = advisor_registry

    def build_step_outputs(
        self,
        *,
        scenario: ScenarioDefinition,
        step: ScenarioStep,
        study_context: StudyContext,
        session_metadata: dict[str, Any],
    ) -> list[AdvisorOutput]:
        """Build specialist outputs for a step and optionally append synthesis."""
        templates = self._ordered_templates(step)
        if not templates:
            return []

        specialist_responses: list[tuple[StepAdvisorOutputTemplate, AgentResponse]] = []
        outputs: list[AdvisorOutput] = []
        for index, template in enumerate(templates):
            advisor = self._advisor_registry.get(template.advisor_id)
            context = AgentContext(
                scenario_id=scenario.scenario_id,
                scenario_title=scenario.title,
                scenario_metadata=scenario.metadata,
                step_id=step.step_id,
                step_title=step.title,
                step_phase=step.phase,
                human_role=scenario.human_role,
                participant_role=study_context.participant_role,
                step_context=step.context,
                step_metadata=step.step_metadata,
                available_actions=step.possible_actions,
                condition_name=study_context.scenario_variant,
                study_context=study_context.model_dump(),
                session_metadata=session_metadata,
                template_recommendation=template.recommendation,
                template_rationale=template.rationale,
                template_confidence=template.confidence,
            )
            response = self._runner.run_one(template.advisor_id, context) or self._fallback_response(
                template
            )
            specialist_responses.append((template, response))
            outputs.append(
                AdvisorOutput(
                    advisor_id=advisor.advisor_id,
                    display_name=advisor.display_name,
                    role=advisor.role,
                    recommendation=response.recommendation,
                    rationale=response.rationale,
                    confidence=response.confidence,
                    source_materials=advisor.source_materials,
                    metadata={
                        **response.metadata,
                        "recommended_action_id": response.recommended_action_id,
                        "focus_tags": response.focus_tags,
                        "panel_position": index,
                    },
                )
            )

        if self._synthesis_enabled(step, specialist_responses):
            synthesis_advisor_id = self._synthesis_advisor_id(step)
            synthesis_definition = self._advisor_registry.get(synthesis_advisor_id)
            synthesis_context = AgentContext(
                scenario_id=scenario.scenario_id,
                scenario_title=scenario.title,
                scenario_metadata=scenario.metadata,
                step_id=step.step_id,
                step_title=step.title,
                step_phase=step.phase,
                human_role=scenario.human_role,
                participant_role=study_context.participant_role,
                step_context=step.context,
                step_metadata=step.step_metadata,
                available_actions=step.possible_actions,
                condition_name=study_context.scenario_variant,
                study_context=study_context.model_dump(),
                session_metadata=session_metadata,
                panel_responses=[response for _, response in specialist_responses],
            )
            synthesis_response = self._runner.run_one(
                synthesis_advisor_id,
                synthesis_context,
            )
            if synthesis_response is not None:
                outputs.append(
                    AdvisorOutput(
                        advisor_id=synthesis_definition.advisor_id,
                        display_name=synthesis_definition.display_name,
                        role=synthesis_definition.role,
                        recommendation=synthesis_response.recommendation,
                        rationale=synthesis_response.rationale,
                        confidence=synthesis_response.confidence,
                        source_materials=synthesis_definition.source_materials,
                        metadata={
                            **synthesis_response.metadata,
                            "recommended_action_id": synthesis_response.recommended_action_id,
                            "focus_tags": synthesis_response.focus_tags,
                            "panel_position": len(outputs),
                        },
                    )
                )

        return outputs

    @staticmethod
    def _ordered_templates(step: ScenarioStep) -> list[StepAdvisorOutputTemplate]:
        """Preserve scenario-authored panel order unless the step overrides it."""
        orchestration = step.step_metadata.get("orchestration", {})
        requested_order = orchestration.get("panel", [])
        if not requested_order:
            return list(step.advisor_outputs)

        template_map = {template.advisor_id: template for template in step.advisor_outputs}
        ordered: list[StepAdvisorOutputTemplate] = []
        for advisor_id in requested_order:
            template = template_map.pop(advisor_id, None)
            if template is not None:
                ordered.append(template)
        ordered.extend(template_map.values())
        return ordered

    @staticmethod
    def _synthesis_enabled(
        step: ScenarioStep,
        specialist_responses: list[tuple[StepAdvisorOutputTemplate, AgentResponse]],
    ) -> bool:
        """Enable synthesis when configured, otherwise default to multi-advisor brief steps."""
        orchestration = step.step_metadata.get("orchestration", {})
        if "enabled" in orchestration:
            return bool(orchestration["enabled"]) and len(specialist_responses) > 1
        return step.phase == "brief" and len(specialist_responses) > 1

    @staticmethod
    def _synthesis_advisor_id(step: ScenarioStep) -> str:
        """Return the advisor identity used for the synthesis layer."""
        orchestration = step.step_metadata.get("orchestration", {})
        return orchestration.get("synthesis_advisor_id", "decision_synthesizer")

    @staticmethod
    def _fallback_response(template: StepAdvisorOutputTemplate) -> AgentResponse:
        """Fallback to the authored template when no runtime specialist exists."""
        return AgentResponse(
            agent_id=template.advisor_id,
            agent_name=template.advisor_id,
            recommendation=template.recommendation,
            rationale=template.rationale,
            confidence=template.confidence,
        )
