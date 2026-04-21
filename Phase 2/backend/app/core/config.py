from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PHASE_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Central application settings for the canonical Phase 2 backend."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Human-Agent Team Simulator API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    frontend_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )
    database_url: str = "sqlite+pysqlite:///./phase2.db"
    default_scenario_id: str = "cisco_product_launch_v1"
    scenario_config_dir: Path = Field(default=PHASE_ROOT / "configs" / "scenarios")
    advisor_config_dir: Path = Field(default=PHASE_ROOT / "configs" / "advisors")

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def _coerce_frontend_origins(cls, value: str | list[str]) -> list[str]:
        """Allow frontend origins to be configured as a list or comma-separated string."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("scenario_config_dir", "advisor_config_dir", mode="before")
    @classmethod
    def _coerce_path(cls, value: str | Path) -> Path:
        """Resolve relative config paths from the Phase 2 repository root."""
        path = Path(value)
        return path if path.is_absolute() else (PHASE_ROOT / path).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings object for the current process."""
    return Settings()
