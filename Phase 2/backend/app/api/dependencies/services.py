from __future__ import annotations

from fastapi import Request

from app.services.prototype_sessions import PrototypeSessionService
from app.services.simulator import SimulatorService


def get_simulator_service(request: Request) -> SimulatorService:
    """Return the app-scoped simulator service built during startup."""
    return request.app.state.simulator_service


def get_prototype_session_service(request: Request) -> PrototypeSessionService:
    """Return the app-scoped service used by the original Figma-aligned prototype UI."""
    return request.app.state.prototype_session_service
