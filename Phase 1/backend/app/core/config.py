from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PHASE_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Simulator Phase 1 Backend"
    api_v1_prefix: str = "/api/v1"
    frontend_origin: str = "http://localhost:3000"
    database_url: str = "sqlite+pysqlite:///./phase1.db"
    default_scenario_id: str = "cisco_product_launch_v1"
    scenario_dir: Path = PHASE_ROOT / "configs" / "scenarios"
    advisor_dir: Path = PHASE_ROOT / "configs" / "advisors"

    @field_validator("scenario_dir", "advisor_dir", mode="before")
    @classmethod
    def _coerce_path(cls, value: str | Path) -> Path:
        path = Path(value)
        return path if path.is_absolute() else (PHASE_ROOT / path).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
