from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.api.routes.health import router as health_router
from app.api.routes.prototype import router as prototype_router
from app.api.routes.simulator import router as simulator_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import create_session_factory
from app.services.advisors import AdvisorRegistry
from app.services.prototype_sessions import PrototypeSessionService
from app.services.scenarios.engine import ScenarioEngine
from app.services.scenarios.loader import ScenarioLoader
from app.services.simulator import SimulatorService


def create_app(settings=None) -> FastAPI:
    """Assemble the FastAPI app and attach long-lived simulator dependencies."""
    settings = settings or get_settings()
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    engine_kwargs: dict = {"future": True}
    if settings.database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        if ":memory:" in settings.database_url:
            engine_kwargs["poolclass"] = StaticPool

    engine = create_engine(settings.database_url, **engine_kwargs)
    session_factory = create_session_factory(engine)
    simulator_service = SimulatorService(
        engine=engine,
        session_factory=session_factory,
        scenario_loader=ScenarioLoader(settings.scenario_config_dir),
        scenario_engine=ScenarioEngine(),
        advisor_registry=AdvisorRegistry(settings.advisor_config_dir),
        default_scenario_id=settings.default_scenario_id,
    )
    prototype_session_service = PrototypeSessionService(session_factory=session_factory)
    simulator_service.create_tables()

    app.state.settings = settings
    app.state.simulator_service = simulator_service
    app.state.prototype_session_service = prototype_session_service

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(prototype_router, prefix=settings.api_v1_prefix)
    app.include_router(simulator_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
