from __future__ import annotations

from datetime import datetime, UTC
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, JSON, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AgentOutput(Base):
    """Stored advisor output snapshot for a specific session step."""

    __tablename__ = "agent_outputs"
    __table_args__ = (
        Index("ix_agent_outputs_session_id", "session_id"),
        Index("ix_agent_outputs_step_id", "step_id"),
        Index("ix_agent_outputs_agent_name", "agent_name"),
    )

    agent_output_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False
    )
    scenario_run_id: Mapped[str | None] = mapped_column(
        ForeignKey("scenario_runs.scenario_run_id", ondelete="SET NULL"), nullable=True
    )
    event_id: Mapped[str | None] = mapped_column(
        ForeignKey("event_logs.event_id", ondelete="SET NULL"), nullable=True
    )
    step_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
