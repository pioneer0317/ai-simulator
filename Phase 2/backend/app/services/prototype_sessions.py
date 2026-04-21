from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session, sessionmaker

from app.db.models.event_log import EventLog
from app.db.models.session import Session as SessionRecord
from app.schemas.prototype import (
    PrototypeSessionCreateRequest,
    PrototypeSessionCreateResponse,
    PrototypeSessionStateResponse,
    PrototypeSessionStateSyncRequest,
)


class PrototypeSessionError(Exception):
    """Base error for the Figma-aligned prototype session service."""


class PrototypeSessionNotFoundError(PrototypeSessionError):
    """Raised when the requested prototype session row does not exist."""


class PrototypeSessionService:
    """Persist the exact prototype role/chat UI state without forcing a new frontend shell."""

    def __init__(self, *, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def create_session(self, request: PrototypeSessionCreateRequest) -> PrototypeSessionCreateResponse:
        """Create one persisted session for the prototype role-selection and live-chat flow."""
        scenario_id = f"prototype_live_chat::{request.professional_role}"
        with self._session_factory() as db:
            record = SessionRecord(
                scenario_id=scenario_id,
                current_step_id="/",
                metadata_json={
                    "prototype": {
                        "professional_role": request.professional_role,
                        "simulation_mode": request.simulation_mode,
                        "current_route": "/",
                        "snapshot": {},
                        "metadata": request.metadata,
                    }
                },
            )
            db.add(record)
            db.flush()
            self._log_event(
                db,
                session_id=record.session_id,
                scenario_id=scenario_id,
                step_id="/",
                event_type="prototype_session_started",
                payload={
                    "professional_role": request.professional_role,
                    "simulation_mode": request.simulation_mode,
                    "metadata": request.metadata,
                },
            )
            db.commit()
            return PrototypeSessionCreateResponse(
                session_id=record.session_id,
                scenario_id=record.scenario_id,
                status=record.status,
                professional_role=request.professional_role,
                simulation_mode=request.simulation_mode,
            )

    def sync_state(
        self,
        session_id: str,
        request: PrototypeSessionStateSyncRequest,
    ) -> PrototypeSessionStateResponse:
        """Persist the latest prototype runtime snapshot for a session."""
        with self._session_factory() as db:
            record = self._get_session(db, session_id)
            metadata = dict(record.metadata_json or {})
            prototype_payload = dict(metadata.get("prototype", {}))
            synced_at = datetime.now(UTC)

            prototype_payload["professional_role"] = request.professional_role
            prototype_payload["current_route"] = request.current_route
            prototype_payload["conversation_turn"] = request.conversation_turn
            prototype_payload["show_context_dashboard"] = request.show_context_dashboard
            prototype_payload["snapshot"] = {
                "messages": [message.model_dump(mode="json") for message in request.messages],
                "data_snapshot": request.data_snapshot,
                "task_completed": request.task_completed,
            }
            prototype_payload["synced_at"] = synced_at.isoformat()

            metadata["prototype"] = prototype_payload
            record.metadata_json = metadata
            record.current_step_id = request.current_route

            if request.task_completed and record.status != "completed":
                record.status = "completed"
                record.completed_at = synced_at
                self._log_event(
                    db,
                    session_id=record.session_id,
                    scenario_id=record.scenario_id,
                    step_id=request.current_route,
                    event_type="prototype_session_completed",
                    payload={
                        "professional_role": request.professional_role,
                        "conversation_turn": request.conversation_turn,
                    },
                )

            self._log_event(
                db,
                session_id=record.session_id,
                scenario_id=record.scenario_id,
                step_id=request.current_route,
                event_type="prototype_state_synced",
                payload={
                    "professional_role": request.professional_role,
                    "conversation_turn": request.conversation_turn,
                    "task_completed": request.task_completed,
                    "message_count": len(request.messages),
                    "user_action_count": len(request.data_snapshot.get("userActions", [])),
                },
            )
            db.commit()
            db.refresh(record)
            return self._to_response(record)

    def get_state(self, session_id: str) -> PrototypeSessionStateResponse:
        """Return the latest stored snapshot for one prototype session."""
        with self._session_factory() as db:
            record = self._get_session(db, session_id)
            return self._to_response(record)

    @staticmethod
    def _get_session(db: Session, session_id: str) -> SessionRecord:
        """Load one persisted session or raise a domain-specific not-found error."""
        record = db.get(SessionRecord, session_id)
        if record is None:
            raise PrototypeSessionNotFoundError(f"Prototype session '{session_id}' was not found.")
        return record

    @staticmethod
    def _to_response(record: SessionRecord) -> PrototypeSessionStateResponse:
        """Convert the stored session metadata into the response used by the prototype frontend."""
        prototype_payload = dict((record.metadata_json or {}).get("prototype", {}))
        snapshot = dict(prototype_payload.get("snapshot", {}))
        return PrototypeSessionStateResponse(
            session_id=record.session_id,
            scenario_id=record.scenario_id,
            status=record.status,
            current_route=prototype_payload.get("current_route", record.current_step_id or "/"),
            professional_role=prototype_payload.get("professional_role", "unknown"),
            simulation_mode=prototype_payload.get("simulation_mode", "testing"),
            conversation_turn=prototype_payload.get("conversation_turn", 0),
            show_context_dashboard=prototype_payload.get("show_context_dashboard", False),
            current_step_id=record.current_step_id,
            synced_at=prototype_payload.get("synced_at"),
            completed_at=record.completed_at,
            snapshot=snapshot,
        )

    @staticmethod
    def _log_event(
        db: Session,
        *,
        session_id: str,
        scenario_id: str,
        step_id: str | None,
        event_type: str,
        payload: dict,
    ) -> None:
        """Append one event row describing a prototype session transition."""
        db.add(
            EventLog(
                session_id=session_id,
                scenario_id=scenario_id,
                step_id=step_id,
                event_type=event_type,
                metadata_json=payload,
            )
        )
