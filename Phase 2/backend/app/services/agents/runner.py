from __future__ import annotations

from app.schemas.agents import AgentContext, AgentResponse
from app.services.agents.ops import OpsAgent
from app.services.agents.orchestrator_agent import OrchestratorAgent
from app.services.agents.policy import PolicyAgent
from app.services.agents.risk import RiskAgent


class AgentRunner:
    def __init__(self) -> None:
        self._registry = {
            "PolicyAgent": PolicyAgent(),
            "RiskAgent": RiskAgent(),
            "OpsAgent": OpsAgent(),
            "OrchestratorAgent": OrchestratorAgent(),
        }

    def run(self, agent_names: list[str], context: AgentContext) -> list[AgentResponse]:
        responses: list[AgentResponse] = []
        for agent_name in agent_names:
            agent = self._registry.get(agent_name)
            if agent is None:
                continue
            responses.append(agent.respond(context))
        return responses

