from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, UTC
from threading import Lock
from typing import Any
from uuid import uuid4


@dataclass(slots=True)
class SessionState:
    session_id: str
    scenario_id: str
    current_step_id: str
    status: str
    participant_id: str | None
    started_at: datetime
    metadata: dict[str, Any] = field(default_factory=dict)
    completed_at: datetime | None = None
    shown_step_ids: set[str] = field(default_factory=set)
    shown_agent_output_step_ids: set[str] = field(default_factory=set)
    actions: list[dict[str, Any]] = field(default_factory=list)
    reflections: list[dict[str, Any]] = field(default_factory=list)


class InMemorySessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}
        self._lock = Lock()

    def create_session(
        self,
        *,
        scenario_id: str,
        current_step_id: str,
        participant_id: str | None,
        metadata: dict[str, Any],
    ) -> SessionState:
        session = SessionState(
            session_id=str(uuid4()),
            scenario_id=scenario_id,
            current_step_id=current_step_id,
            status="active",
            participant_id=participant_id,
            started_at=datetime.now(UTC),
            metadata=metadata,
        )
        with self._lock:
            self._sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> SessionState | None:
        return self._sessions.get(session_id)

    def record_action(self, session_id: str, payload: dict[str, Any]) -> None:
        session = self._require_session(session_id)
        session.actions.append(payload)

    def record_reflection(self, session_id: str, payload: dict[str, Any]) -> None:
        session = self._require_session(session_id)
        session.reflections.append(payload)

    def mark_step_shown(self, session_id: str, step_id: str) -> bool:
        session = self._require_session(session_id)
        if step_id in session.shown_step_ids:
            return False
        session.shown_step_ids.add(step_id)
        return True

    def mark_agent_outputs_shown(self, session_id: str, step_id: str) -> bool:
        session = self._require_session(session_id)
        if step_id in session.shown_agent_output_step_ids:
            return False
        session.shown_agent_output_step_ids.add(step_id)
        return True

    def advance_session(self, session_id: str, next_step_id: str) -> None:
        session = self._require_session(session_id)
        session.current_step_id = next_step_id

    def complete_session(self, session_id: str) -> None:
        session = self._require_session(session_id)
        session.status = "completed"
        session.completed_at = datetime.now(UTC)

    def _require_session(self, session_id: str) -> SessionState:
        session = self.get_session(session_id)
        if session is None:
            raise KeyError(session_id)
        return session

