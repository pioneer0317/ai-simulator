from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.agents import AgentContext, AgentResponse


class BaseAgent(ABC):
    name: str

    @abstractmethod
    def respond(self, context: AgentContext) -> AgentResponse:
        """Return a deterministic structured recommendation."""

