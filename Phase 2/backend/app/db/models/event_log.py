from __future__ import annotations

from datetime import datetime, UTC
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EventLog(Base):
    """Append-only log of what actually happened during a session."""

    __tablename__ = "event_logs"
    __table_args__ = (
        Index("ix_event_logs_session_id", "session_id"),
        Index("ix_event_logs_scenario_id", "scenario_id"),
        Index("ix_event_logs_step_id", "step_id"),
        Index("ix_event_logs_event_type", "event_type"),
        Index("ix_event_logs_event_timestamp", "event_timestamp"),
    )

    event_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False
    )
    scenario_run_id: Mapped[str | None] = mapped_column(
        ForeignKey("scenario_runs.scenario_run_id", ondelete="SET NULL"), nullable=True
    )
    scenario_id: Mapped[str] = mapped_column(String(255), nullable=False)
    step_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    event_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
