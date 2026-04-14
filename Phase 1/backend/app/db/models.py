from __future__ import annotations

from datetime import datetime, UTC
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utc_now() -> datetime:
    return datetime.now(UTC)


class SessionRecord(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("ix_sessions_scenario_id", "scenario_id"),
        Index("ix_sessions_status", "status"),
    )

    session_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    participant_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scenario_id: Mapped[str] = mapped_column(String(255), nullable=False)
    current_step_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class StepResponseRecord(Base):
    __tablename__ = "step_responses"
    __table_args__ = (
        Index("ix_step_responses_session_id", "session_id"),
        Index("ix_step_responses_step_id", "step_id"),
    )

    step_response_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False
    )
    step_id: Mapped[str] = mapped_column(String(255), nullable=False)
    phase: Mapped[str] = mapped_column(String(50), nullable=False, default="decide")
    advisor_outputs_json: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    chosen_action_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    reflection_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    reflection_confidence: Mapped[float | None] = mapped_column(nullable=True)
    reflection_metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    shown_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reflection_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class EventLogRecord(Base):
    __tablename__ = "event_logs"
    __table_args__ = (
        Index("ix_event_logs_session_id", "session_id"),
        Index("ix_event_logs_step_id", "step_id"),
        Index("ix_event_logs_event_type", "event_type"),
        Index("ix_event_logs_created_at", "created_at"),
    )

    event_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False
    )
    step_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
