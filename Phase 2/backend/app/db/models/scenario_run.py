from __future__ import annotations

from datetime import datetime, UTC
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ScenarioRun(Base):
    """Optional future-facing model for multi-scenario or multi-condition runs."""

    __tablename__ = "scenario_runs"
    __table_args__ = (
        Index("ix_scenario_runs_session_id", "session_id"),
        Index("ix_scenario_runs_scenario_id", "scenario_id"),
        Index("ix_scenario_runs_status", "status"),
    )

    scenario_run_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False
    )
    scenario_id: Mapped[str] = mapped_column(String(255), nullable=False)
    scenario_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_step_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assigned_condition: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
