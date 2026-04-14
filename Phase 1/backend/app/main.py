from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.api.routes.health import router as health_router
from app.api.routes.simulator import router as simulator_router
from app.core.config import Settings, get_settings
from app.db.session import create_session_factory
from app.services.advisors import AdvisorRegistry
from app.services.scenarios import ScenarioEngine, ScenarioLoader
from app.services.simulator import SimulatorService


def create_app(settings: Settings | None = None) -> FastAPI:
    """Assemble the FastAPI app and attach the simulator dependencies."""
    app_settings = settings or get_settings()

    app = FastAPI(title=app_settings.app_name, version="0.1.0", docs_url="/docs", redoc_url="/redoc")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[app_settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    engine_kwargs: dict = {"future": True}
    if app_settings.database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        if ":memory:" in app_settings.database_url:
            engine_kwargs["poolclass"] = StaticPool

    engine = create_engine(app_settings.database_url, **engine_kwargs)
    session_factory = create_session_factory(engine)
    # Build the long-lived service objects once when the app starts.
    simulator_service = SimulatorService(
        engine=engine,
        session_factory=session_factory,
        scenario_loader=ScenarioLoader(app_settings.scenario_dir),
        scenario_engine=ScenarioEngine(),
        advisor_registry=AdvisorRegistry(app_settings.advisor_dir),
        default_scenario_id=app_settings.default_scenario_id,
    )
    # Phase 1 bootstraps the schema directly instead of using migrations.
    simulator_service.create_tables()

    app.state.settings = app_settings
    app.state.simulator_service = simulator_service

    app.include_router(health_router, prefix=app_settings.api_v1_prefix)
    app.include_router(simulator_router, prefix=app_settings.api_v1_prefix)
    return app


app = create_app()
