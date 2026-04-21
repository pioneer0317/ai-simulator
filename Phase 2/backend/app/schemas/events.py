from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class EventType(StrEnum):
    SESSION_STARTED = "session_started"
    SCENARIO_STEP_SHOWN = "scenario_step_shown"
    AGENT_OUTPUT_SHOWN = "agent_output_shown"
    USER_ACTION_SUBMITTED = "user_action_submitted"
    RATIONALE_SUBMITTED = "rationale_submitted"
    REFLECTION_SUBMITTED = "reflection_submitted"
    SCENARIO_COMPLETED = "scenario_completed"


class EventRecord(BaseModel):
    event_id: str
    session_id: str
    scenario_id: str
    step_id: str | None = None
    timestamp: datetime
    event_type: EventType
    metadata: dict[str, Any] = Field(default_factory=dict)

