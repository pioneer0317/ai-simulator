from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.episodes import router as episodes_router
from app.api.routes.health import router as health_router
from app.core.config import Settings, get_settings
from app.services.episodes.engine import EpisodeEngine
from app.services.episodes.loader import EpisodeLoader
from app.services.llm.agent import LLMAgentResponder
from app.services.llm.client import (
    ChatCompletionsLLMClient,
    DisabledLLMClient,
    FixtureLLMClient,
    GeminiLLMClient,
)
from app.services.llm.classifier import LLMSemanticClassifier
from app.services.llm.fallback import ScenarioFallbackAgentResponder
from app.services.llm.grader import LLMGrader
from app.services.llm.prompts import PromptTemplateRenderer
from app.services.scoring.deterministic import DeterministicScorer
from app.services.session_store import InMemorySessionStore, MySQLSessionStore, SQLiteSessionStore
from app.services.sessions import EpisodeSessionService


def create_app(settings: Settings | None = None) -> FastAPI:
    """Assemble the simulator backend."""
    settings = settings or get_settings()
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

    llm_requested = (
        settings.llm_grader_enabled
        or settings.llm_classifier_enabled
        or settings.llm_agent_enabled
    )
    if not llm_requested:
        llm_client = DisabledLLMClient()
    elif settings.llm_provider == "fixture":
        llm_client = FixtureLLMClient()
    elif settings.llm_provider == "chat_completions":
        llm_client = ChatCompletionsLLMClient(
            api_key=settings.llm_api_key or "",
            model=settings.llm_model,
            base_url=settings.llm_base_url or "",
            timeout_seconds=settings.llm_timeout_seconds,
        )
    elif settings.llm_provider == "gemini":
        llm_client = GeminiLLMClient(
            api_key=settings.llm_api_key or "",
            model=settings.llm_model,
            base_url=settings.llm_base_url or "https://generativelanguage.googleapis.com/v1beta",
            timeout_seconds=settings.llm_timeout_seconds,
        )
    else:
        llm_client = DisabledLLMClient()

    if settings.storage_backend == "mysql":
        if not settings.database_url:
            raise ValueError("SIMULATOR_DATABASE_URL is required when SIMULATOR_STORAGE_BACKEND=mysql.")
        session_store = MySQLSessionStore(settings.database_url)
    elif settings.storage_backend == "sqlite":
        session_store = SQLiteSessionStore(settings.database_url or "sqlite:///simulator-dev.sqlite")
    else:
        session_store = InMemorySessionStore()

    episode_session_service = EpisodeSessionService(
        episode_loader=EpisodeLoader(settings.episode_config_dir),
        episode_engine=EpisodeEngine(),
        scorer=DeterministicScorer(settings.scoring_rubric_path),
        semantic_classifier=LLMSemanticClassifier(
            enabled=settings.llm_classifier_enabled,
            client=llm_client,
            prompt_renderer=PromptTemplateRenderer(settings.prompt_template_dir),
            provider_name=settings.llm_provider,
        ),
        llm_grader=LLMGrader(
            enabled=settings.llm_grader_enabled,
            client=llm_client,
            prompt_renderer=PromptTemplateRenderer(settings.prompt_template_dir),
            provider_name=settings.llm_provider,
        ),
        agent_responder=LLMAgentResponder(
            enabled=settings.llm_agent_enabled,
            client=llm_client,
            prompt_renderer=PromptTemplateRenderer(settings.prompt_template_dir),
            provider_name=settings.llm_provider,
        ),
        fallback_agent_responder=ScenarioFallbackAgentResponder(),
        assistant_fallback_enabled=settings.assistant_fallback_enabled,
        session_store=session_store,
        environment=settings.app_env,
    )

    app.state.settings = settings
    app.state.episode_session_service = episode_session_service

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(episodes_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
