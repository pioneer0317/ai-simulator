from __future__ import annotations

from datetime import datetime, UTC
from typing import Any
from uuid import uuid4

from app.schemas.events import EventRecord, EventType


class EventLogger:
    def __init__(self) -> None:
        self._events: list[EventRecord] = []

    def log(
        self,
        *,
        event_type: EventType,
        session_id: str,
        scenario_id: str,
        step_id: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> EventRecord:
        event = EventRecord(
            event_id=str(uuid4()),
            session_id=session_id,
            scenario_id=scenario_id,
            step_id=step_id,
            timestamp=datetime.now(UTC),
            event_type=event_type,
            metadata=metadata or {},
        )
        self._events.append(event)
        return event

    def list_events(self) -> list[EventRecord]:
        return list(self._events)

