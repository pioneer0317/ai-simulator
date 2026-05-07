from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
import json
from pathlib import Path
import sqlite3
from typing import Protocol
from urllib.parse import unquote

from app.schemas.episode import ParticipantEpisode
from app.schemas.session import ParticipantProfile, SessionEvent


@dataclass
class SessionRecord:
    """Persistable session state used by the simulator service."""

    session_id: str
    participant_run_id: str
    episode_id: str
    participant_profile: ParticipantProfile
    participant_episode: ParticipantEpisode
    environment: str
    status: str = "active"
    events: list[SessionEvent] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None


class SessionStore(Protocol):
    """Storage boundary for sessions and event logs."""

    backend_name: str

    def get(self, session_id: str) -> SessionRecord | None:
        """Return one session with its events, or None."""

    def save(self, record: SessionRecord) -> None:
        """Persist the full session state."""

    def list(self) -> list[SessionRecord]:
        """Return all sessions with events for admin review."""


class InMemorySessionStore:
    """Fast non-persistent store for tests and throwaway local runs."""

    backend_name = "memory"

    def __init__(self) -> None:
        self._sessions: dict[str, SessionRecord] = {}

    def get(self, session_id: str) -> SessionRecord | None:
        return self._sessions.get(session_id)

    def save(self, record: SessionRecord) -> None:
        self._sessions[record.session_id] = record

    def list(self) -> list[SessionRecord]:
        return sorted(
            self._sessions.values(),
            key=lambda record: record.started_at,
            reverse=True,
        )


class SQLiteSessionStore:
    """Local/offline persistent store for sessions and event logs."""

    backend_name = "sqlite"

    def __init__(self, database_url: str) -> None:
        self._path = _sqlite_path(database_url)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def get(self, session_id: str) -> SessionRecord | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT session_id, participant_run_id, episode_id, environment, status,
                       participant_profile_json, participant_episode_json,
                       started_at, completed_at
                FROM sessions
                WHERE session_id = ?
                """,
                (session_id,),
            ).fetchone()
            if row is None:
                return None

            event_rows = conn.execute(
                """
                SELECT event_json
                FROM session_events
                WHERE session_id = ?
                ORDER BY sequence_index ASC
                """,
                (session_id,),
            ).fetchall()

        return SessionRecord(
            session_id=row["session_id"],
            participant_run_id=row["participant_run_id"] or _fallback_participant_run_id(row["session_id"]),
            episode_id=row["episode_id"],
            environment=row["environment"],
            status=row["status"],
            participant_profile=ParticipantProfile.model_validate(
                json.loads(row["participant_profile_json"])
            ),
            participant_episode=ParticipantEpisode.model_validate(
                json.loads(row["participant_episode_json"])
            ),
            events=[
                SessionEvent.model_validate(json.loads(event_row["event_json"]))
                for event_row in event_rows
            ],
            started_at=_parse_datetime(row["started_at"]),
            completed_at=_parse_datetime(row["completed_at"]),
        )

    def save(self, record: SessionRecord) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO sessions (
                    session_id, participant_run_id, episode_id, environment, status,
                    participant_profile_json, participant_episode_json,
                    started_at, completed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    participant_run_id = excluded.participant_run_id,
                    episode_id = excluded.episode_id,
                    environment = excluded.environment,
                    status = excluded.status,
                    participant_profile_json = excluded.participant_profile_json,
                    participant_episode_json = excluded.participant_episode_json,
                    started_at = excluded.started_at,
                    completed_at = excluded.completed_at
                """,
                (
                    record.session_id,
                    record.participant_run_id,
                    record.episode_id,
                    record.environment,
                    record.status,
                    _json(record.participant_profile),
                    _json(record.participant_episode),
                    _datetime(record.started_at),
                    _datetime(record.completed_at),
                ),
            )
            conn.execute("DELETE FROM session_events WHERE session_id = ?", (record.session_id,))
            conn.executemany(
                """
                INSERT INTO session_events (
                    event_id, session_id, episode_id, sequence_index,
                    event_type, actor, artifact_id, created_at, event_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        event.event_id,
                        event.session_id,
                        event.episode_id,
                        _sequence_index(position, event),
                        event.event_type,
                        event.actor,
                        event.artifact_id,
                        _datetime(event.created_at),
                        _json(event),
                    )
                    for position, event in enumerate(record.events)
                ],
            )

    def list(self) -> list[SessionRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT session_id
                FROM sessions
                ORDER BY started_at DESC
                """
            ).fetchall()

        records: list[SessionRecord] = []
        for row in rows:
            record = self.get(row["session_id"])
            if record is not None:
                records.append(record)
        return records

    def _initialize(self) -> None:
        with self._connect() as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    participant_run_id TEXT NOT NULL,
                    episode_id TEXT NOT NULL,
                    environment TEXT NOT NULL,
                    status TEXT NOT NULL,
                    participant_profile_json TEXT NOT NULL,
                    participant_episode_json TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    completed_at TEXT
                )
                """
            )
            _ensure_column(conn, "sessions", "participant_run_id", "TEXT")
            conn.execute(
                """
                UPDATE sessions
                SET participant_run_id = 'run-' || session_id
                WHERE participant_run_id IS NULL OR participant_run_id = ''
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS session_events (
                    event_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    episode_id TEXT NOT NULL,
                    sequence_index INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    artifact_id TEXT,
                    created_at TEXT NOT NULL,
                    event_json TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_session_events_session_sequence
                ON session_events(session_id, sequence_index)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_session_events_type_created
                ON session_events(event_type, created_at)
                """
            )

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        return conn


def _sqlite_path(database_url: str) -> Path:
    if not database_url.startswith("sqlite:///"):
        raise ValueError("SQLiteSessionStore requires a sqlite:/// database URL.")
    raw_path = unquote(database_url.removeprefix("sqlite:///"))
    if raw_path.startswith("/"):
        path = Path(raw_path)
    else:
        path = Path(raw_path)
    if not raw_path:
        raise ValueError("SQLite database URL must include a file path.")
    return path.expanduser().resolve()


def _ensure_column(conn: sqlite3.Connection, table_name: str, column_name: str, definition: str) -> None:
    columns = {
        row["name"]
        for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in columns:
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


def _fallback_participant_run_id(session_id: str) -> str:
    return f"run-{session_id}"


def _json(model) -> str:
    return json.dumps(model.model_dump(mode="json"), separators=(",", ":"))


def _datetime(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _parse_datetime(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _sequence_index(position: int, event: SessionEvent) -> int:
    value = event.metadata.get("sequence_index")
    return value if isinstance(value, int) else position
