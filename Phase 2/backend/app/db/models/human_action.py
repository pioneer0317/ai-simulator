from __future__ import annotations

from datetime import datetime, UTC
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HumanAction(Base):
    """One recorded human action taken during a session step."""

    __tablename__ = "human_actions"
    __table_args__ = (
        Index("ix_human_actions_session_id", "session_id"),
        Index("ix_human_actions_step_id", "step_id"),
        Index("ix_human_actions_action_id", "action_id"),
    )

    human_action_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False
    )
    scenario_run_id: Mapped[str | None] = mapped_column(
        ForeignKey("scenario_runs.scenario_run_id", ondelete="SET NULL"), nullable=True
    )
    step_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action_id: Mapped[str] = mapped_column(String(255), nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
