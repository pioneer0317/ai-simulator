from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Runtime configuration for the simulator backend."""

    model_config = SettingsConfigDict(
        env_prefix="SIMULATOR_",
        env_file=".env",
        extra="ignore",
    )

    app_name: str = "Human-Agent Team Simulator"
    app_env: Literal["dev", "prod"] = "dev"
    api_v1_prefix: str = "/api/v1"
    frontend_origins: list[str] = Field(default_factory=lambda: ["*"])
    storage_backend: Literal["memory", "sqlite", "mysql"] = "memory"
    database_url: str | None = None
    episode_config_dir: Path = Field(
        default_factory=lambda: _project_root() / "configs" / "episodes"
    )
    scoring_rubric_path: Path = Field(
        default_factory=lambda: _project_root() / "configs" / "scoring" / "dimension_rubric.yaml"
    )
    prompt_template_dir: Path = Field(
        default_factory=lambda: _project_root() / "configs" / "prompts"
    )
    llm_grader_enabled: bool = False
    llm_classifier_enabled: bool = False
    llm_agent_enabled: bool = False
    llm_provider: str = "disabled"
    llm_model: str = "provider-model"
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    llm_timeout_seconds: float = 30.0
    assistant_fallback_enabled: bool = True

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def _split_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return cached settings so route dependencies share one configuration."""
    return Settings()
