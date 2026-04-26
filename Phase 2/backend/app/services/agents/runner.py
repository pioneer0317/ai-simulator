from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.drifter_specialist import DrifterSpecialistAgent
from app.services.agents.guardrail_auditor_agent import GuardrailAuditorAgent
from app.services.agents.ops import OpsAgent
from app.services.agents.orchestrator_agent import OrchestratorAgent
from app.services.agents.policy import PolicyAgent
from app.services.agents.predictor_specialist import PredictorSpecialistAgent
from app.services.agents.risk import RiskAgent
from app.services.agents.situation_analyst import SituationAnalystAgent


class AgentRunner:
    def __init__(self) -> None:
        self._registry = {
            "situation_analyst": SituationAnalystAgent(),
            "drifter": DrifterSpecialistAgent(),
            "guardrail_auditor": GuardrailAuditorAgent(),
            "predictor": PredictorSpecialistAgent(),
            "decision_synthesizer": OrchestratorAgent(),
            "PolicyAgent": PolicyAgent(),
            "RiskAgent": RiskAgent(),
            "OpsAgent": OpsAgent(),
            "OrchestratorAgent": OrchestratorAgent(),
        }

    def run_one(self, agent_name: str, context: AgentContext) -> AgentResponse | None:
        """Return one agent response when the registry contains the requested agent."""
        agent = self._registry.get(agent_name)
        if agent is None:
            return None
        return agent.respond(context)

    def run(self, agent_names: list[str], context: AgentContext) -> list[AgentResponse]:
        """Run several agents over the same context and preserve their declared order."""
        responses: list[AgentResponse] = []
        for agent_name in agent_names:
            response = self.run_one(agent_name, context)
            if response is not None:
                responses.append(response)
        return responses
