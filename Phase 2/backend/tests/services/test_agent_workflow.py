from app.core.config import get_settings
from app.schemas.scenario import ScenarioDefinition, ScenarioStep, StepAdvisorOutputTemplate
from app.schemas.sessions import StudyContext
from app.services.advisors import AdvisorRegistry
from app.services.agents.runner import AgentRunner
from app.services.agents.workflow import MultiAgentWorkflow


def test_single_advisor_step_does_not_add_synthesis() -> None:
    """Single-agent scenarios should activate one advisor and skip synthesis."""
    settings = get_settings()
    workflow = MultiAgentWorkflow(
        runner=AgentRunner(),
        advisor_registry=AdvisorRegistry(settings.advisor_config_dir),
    )
    scenario = ScenarioDefinition(
        scenario_id="single_agent_probe",
        title="Single Agent Probe",
        description="Synthetic test scenario for orchestration shape.",
        human_role="Participant",
        steps=[],
    )
    step = ScenarioStep(
        step_id="single_agent_step",
        phase="brief",
        title="Single advisor brief",
        context="Only one advisor is authored for this step.",
        advisor_outputs=[
            StepAdvisorOutputTemplate(
                advisor_id="situation_analyst",
                recommendation="Proceed with a narrow validation path.",
                rationale="One specialist is enough for this test step.",
                confidence=0.72,
            )
        ],
        reflection_prompt="",
        reflection_enabled=False,
    )

    outputs = workflow.build_step_outputs(
        scenario=scenario,
        step=step,
        study_context=StudyContext(participant_role="Product Manager"),
        session_metadata={},
    )

    assert len(outputs) == 1
    assert outputs[0].advisor_id == "situation_analyst"
    assert outputs[0].display_name == "AI Analyst"
