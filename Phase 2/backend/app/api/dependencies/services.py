from __future__ import annotations

from fastapi import Request

from app.services.simulator import SimulatorService


def get_simulator_service(request: Request) -> SimulatorService:
    """Return the app-scoped simulator service built during startup."""
    return request.app.state.simulator_service
