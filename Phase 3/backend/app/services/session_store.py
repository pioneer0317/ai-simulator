from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
import json
from pathlib import Path
import sqlite3
from typing import Any, Protocol
from urllib.parse import unquote, urlparse

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
    pre_questionnaire: dict[str, Any] | None = None
    post_questionnaire: dict[str, Any] | None = None
    analytics_dashboard: dict[str, Any] | None = None
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

    def append_event(self, session_id: str, event: SessionEvent) -> None:
        """Append one event without rewriting the existing event log."""

    def update_event_metadata(
        self,
        session_id: str,
        event_id: str,
        metadata: dict[str, Any],
    ) -> None:
        """Update metadata for one existing event."""

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

    def append_event(self, session_id: str, event: SessionEvent) -> None:
        record = self._sessions.get(session_id)
        if record is None:
            return
        for index, existing_event in enumerate(record.events):
            if existing_event.event_id == event.event_id:
                existing_event.metadata["sequence_index"] = index
                return
        event.metadata["sequence_index"] = len(record.events)
        record.events.append(event)

    def update_event_metadata(
        self,
        session_id: str,
        event_id: str,
        metadata: dict[str, Any],
    ) -> None:
        record = self._sessions.get(session_id)
        if record is None:
            return
        for event in record.events:
            if event.event_id == event_id:
                event.metadata = metadata
                return

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
                       pre_questionnaire_json, post_questionnaire_json,
                       analytics_dashboard_json,
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
            pre_questionnaire=_parse_json_data(row["pre_questionnaire_json"]),
            post_questionnaire=_parse_json_data(row["post_questionnaire_json"]),
            analytics_dashboard=_parse_json_data(row["analytics_dashboard_json"]),
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
                    pre_questionnaire_json, post_questionnaire_json,
                    analytics_dashboard_json,
                    started_at, completed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    participant_run_id = excluded.participant_run_id,
                    episode_id = excluded.episode_id,
                    environment = excluded.environment,
                    status = excluded.status,
                    participant_profile_json = excluded.participant_profile_json,
                    participant_episode_json = excluded.participant_episode_json,
                    pre_questionnaire_json = excluded.pre_questionnaire_json,
                    post_questionnaire_json = excluded.post_questionnaire_json,
                    analytics_dashboard_json = excluded.analytics_dashboard_json,
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
                    _json_data(record.pre_questionnaire),
                    _json_data(record.post_questionnaire),
                    _json_data(record.analytics_dashboard),
                    _datetime(record.started_at),
                    _datetime(record.completed_at),
                ),
            )

    def append_event(self, session_id: str, event: SessionEvent) -> None:
        with self._connect() as conn:
            sequence_index = _next_sqlite_sequence_index(conn, session_id)
            event.metadata["sequence_index"] = sequence_index
            conn.execute(
                """
                INSERT INTO session_events (
                    event_id, session_id, episode_id, sequence_index,
                    event_type, actor, artifact_id, created_at, event_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.event_id,
                    session_id,
                    event.episode_id,
                    sequence_index,
                    event.event_type,
                    event.actor,
                    event.artifact_id,
                    _datetime(event.created_at),
                    _json(event),
                ),
            )

    def update_event_metadata(
        self,
        session_id: str,
        event_id: str,
        metadata: dict[str, Any],
    ) -> None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT event_json
                FROM session_events
                WHERE session_id = ? AND event_id = ?
                """,
                (session_id, event_id),
            ).fetchone()
            if row is None:
                return
            event = SessionEvent.model_validate(json.loads(row["event_json"]))
            event.metadata = metadata
            conn.execute(
                """
                UPDATE session_events
                SET event_json = ?
                WHERE session_id = ? AND event_id = ?
                """,
                (_json(event), session_id, event_id),
            )

    def list(self) -> list[SessionRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT session_id, participant_run_id, episode_id, environment, status,
                       participant_profile_json, participant_episode_json,
                       pre_questionnaire_json, post_questionnaire_json,
                       analytics_dashboard_json,
                       started_at, completed_at
                FROM sessions
                ORDER BY started_at DESC
                """
            ).fetchall()
            session_ids = [row["session_id"] for row in rows]
            event_rows: list[sqlite3.Row] = []
            if session_ids:
                placeholders = ",".join("?" for _ in session_ids)
                event_rows = conn.execute(
                    f"""
                    SELECT session_id, event_json
                    FROM session_events
                    WHERE session_id IN ({placeholders})
                    ORDER BY session_id ASC, sequence_index ASC
                    """,
                    session_ids,
                ).fetchall()

        events_by_session = _bucket_event_rows(event_rows)
        return [
            _record_from_row(row, events_by_session.get(row["session_id"], []))
            for row in rows
        ]

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
                    pre_questionnaire_json TEXT,
                    post_questionnaire_json TEXT,
                    analytics_dashboard_json TEXT,
                    started_at TEXT NOT NULL,
                    completed_at TEXT
                )
                """
            )
            _ensure_column(conn, "sessions", "participant_run_id", "TEXT")
            _ensure_column(conn, "sessions", "pre_questionnaire_json", "TEXT")
            _ensure_column(conn, "sessions", "post_questionnaire_json", "TEXT")
            _ensure_column(conn, "sessions", "analytics_dashboard_json", "TEXT")
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
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_session_events_episode_type_created
                ON session_events(episode_id, event_type, created_at)
                """
            )
            _backfill_sqlite_questionnaire_columns(conn)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        return conn


class MySQLSessionStore:
    """Cloud persistent store for sessions and event logs on MySQL-compatible RDS."""

    backend_name = "mysql"

    def __init__(self, database_url: str) -> None:
        self._config = _mysql_config(database_url)
        self._initialize()

    def get(self, session_id: str) -> SessionRecord | None:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT session_id, participant_run_id, episode_id, environment, status,
                           participant_profile_json, participant_episode_json,
                           pre_questionnaire_json, post_questionnaire_json,
                           analytics_dashboard_json,
                           started_at, completed_at
                    FROM sessions
                    WHERE session_id = %s
                    """,
                    (session_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    return None

                cursor.execute(
                    """
                    SELECT event_json
                    FROM session_events
                    WHERE session_id = %s
                    ORDER BY sequence_index ASC
                    """,
                    (session_id,),
                )
                event_rows = cursor.fetchall()

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
            pre_questionnaire=_parse_json_data(row["pre_questionnaire_json"]),
            post_questionnaire=_parse_json_data(row["post_questionnaire_json"]),
            analytics_dashboard=_parse_json_data(row["analytics_dashboard_json"]),
            events=[
                SessionEvent.model_validate(json.loads(event_row["event_json"]))
                for event_row in event_rows
            ],
            started_at=_parse_datetime(row["started_at"]),
            completed_at=_parse_datetime(row["completed_at"]),
        )

    def save(self, record: SessionRecord) -> None:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO sessions (
                        session_id, participant_run_id, episode_id, environment, status,
                        participant_profile_json, participant_episode_json,
                        pre_questionnaire_json, post_questionnaire_json,
                        analytics_dashboard_json,
                        started_at, completed_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        participant_run_id = VALUES(participant_run_id),
                        episode_id = VALUES(episode_id),
                        environment = VALUES(environment),
                        status = VALUES(status),
                        participant_profile_json = VALUES(participant_profile_json),
                        participant_episode_json = VALUES(participant_episode_json),
                        pre_questionnaire_json = VALUES(pre_questionnaire_json),
                        post_questionnaire_json = VALUES(post_questionnaire_json),
                        analytics_dashboard_json = VALUES(analytics_dashboard_json),
                        started_at = VALUES(started_at),
                        completed_at = VALUES(completed_at)
                    """,
                    (
                        record.session_id,
                        record.participant_run_id,
                        record.episode_id,
                        record.environment,
                        record.status,
                        _json(record.participant_profile),
                        _json(record.participant_episode),
                        _json_data(record.pre_questionnaire),
                        _json_data(record.post_questionnaire),
                        _json_data(record.analytics_dashboard),
                        _datetime(record.started_at),
                        _datetime(record.completed_at),
                    ),
                )

            conn.commit()

    def append_event(self, session_id: str, event: SessionEvent) -> None:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                sequence_index = _next_mysql_sequence_index(cursor, session_id)
                event.metadata["sequence_index"] = sequence_index
                cursor.execute(
                    """
                    INSERT INTO session_events (
                        event_id, session_id, episode_id, sequence_index,
                        event_type, actor, artifact_id, created_at, event_json
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        event.event_id,
                        session_id,
                        event.episode_id,
                        sequence_index,
                        event.event_type,
                        event.actor,
                        event.artifact_id,
                        _datetime(event.created_at),
                        _json(event),
                    ),
                )
            conn.commit()

    def update_event_metadata(
        self,
        session_id: str,
        event_id: str,
        metadata: dict[str, Any],
    ) -> None:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT event_json
                    FROM session_events
                    WHERE session_id = %s AND event_id = %s
                    """,
                    (session_id, event_id),
                )
                row = cursor.fetchone()
                if row is None:
                    return
                event = SessionEvent.model_validate(json.loads(row["event_json"]))
                event.metadata = metadata
                cursor.execute(
                    """
                    UPDATE session_events
                    SET event_json = %s
                    WHERE session_id = %s AND event_id = %s
                    """,
                    (_json(event), session_id, event_id),
                )
            conn.commit()

    def list(self) -> list[SessionRecord]:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT session_id, participant_run_id, episode_id, environment, status,
                           participant_profile_json, participant_episode_json,
                           pre_questionnaire_json, post_questionnaire_json,
                           analytics_dashboard_json,
                           started_at, completed_at
                    FROM sessions
                    ORDER BY started_at DESC
                    """
                )
                rows = cursor.fetchall()
                session_ids = [row["session_id"] for row in rows]
                event_rows: list[dict[str, Any]] = []
                if session_ids:
                    placeholders = ",".join(["%s"] * len(session_ids))
                    cursor.execute(
                        f"""
                        SELECT session_id, event_json
                        FROM session_events
                        WHERE session_id IN ({placeholders})
                        ORDER BY session_id ASC, sequence_index ASC
                        """,
                        session_ids,
                    )
                    event_rows = cursor.fetchall()

        events_by_session = _bucket_event_rows(event_rows)
        return [
            _record_from_row(row, events_by_session.get(row["session_id"], []))
            for row in rows
        ]

    def _initialize(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS sessions (
                        session_id VARCHAR(64) PRIMARY KEY,
                        participant_run_id VARCHAR(96) NOT NULL,
                        episode_id VARCHAR(128) NOT NULL,
                        environment VARCHAR(16) NOT NULL,
                        status VARCHAR(32) NOT NULL,
                        participant_profile_json LONGTEXT NOT NULL,
                        participant_episode_json LONGTEXT NOT NULL,
                        pre_questionnaire_json LONGTEXT NULL,
                        post_questionnaire_json LONGTEXT NULL,
                        analytics_dashboard_json LONGTEXT NULL,
                        started_at VARCHAR(64) NOT NULL,
                        completed_at VARCHAR(64) NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """
                )
                _ensure_mysql_column(cursor, "sessions", "pre_questionnaire_json", "LONGTEXT NULL")
                _ensure_mysql_column(cursor, "sessions", "post_questionnaire_json", "LONGTEXT NULL")
                _ensure_mysql_column(cursor, "sessions", "analytics_dashboard_json", "LONGTEXT NULL")
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS session_events (
                        event_id VARCHAR(64) PRIMARY KEY,
                        session_id VARCHAR(64) NOT NULL,
                        episode_id VARCHAR(128) NOT NULL,
                        sequence_index INT NOT NULL,
                        event_type VARCHAR(128) NOT NULL,
                        actor VARCHAR(32) NOT NULL,
                        artifact_id VARCHAR(128) NULL,
                        created_at VARCHAR(64) NOT NULL,
                        event_json LONGTEXT NOT NULL,
                        CONSTRAINT fk_session_events_session
                            FOREIGN KEY(session_id) REFERENCES sessions(session_id)
                            ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """
                )
                _ensure_mysql_index(cursor, "session_events", "idx_session_events_session_sequence", "session_id, sequence_index")
                _ensure_mysql_index(cursor, "session_events", "idx_session_events_type_created", "event_type, created_at")
                _ensure_mysql_index(cursor, "session_events", "idx_session_events_episode_type_created", "episode_id, event_type, created_at")
                _backfill_mysql_questionnaire_columns(cursor)
            conn.commit()

    def _connect(self):
        try:
            import pymysql
            from pymysql.cursors import DictCursor
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise RuntimeError(
                "PyMySQL is required for SIMULATOR_STORAGE_BACKEND=mysql. "
                "Install backend dependencies from pyproject.toml."
            ) from exc

        return pymysql.connect(
            host=self._config["host"],
            port=self._config["port"],
            user=self._config["user"],
            password=self._config["password"],
            database=self._config["database"],
            cursorclass=DictCursor,
            charset="utf8mb4",
        )


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


def _mysql_config(database_url: str) -> dict[str, str | int]:
    parsed = urlparse(database_url)
    if parsed.scheme not in {"mysql", "mysql+pymysql"}:
        raise ValueError("MySQLSessionStore requires a mysql:// or mysql+pymysql:// database URL.")
    database = parsed.path.lstrip("/")
    if not parsed.hostname or not parsed.username or not database:
        raise ValueError("MySQL database URL must include username, host, and database name.")
    return {
        "host": parsed.hostname,
        "port": parsed.port or 3306,
        "user": unquote(parsed.username),
        "password": unquote(parsed.password or ""),
        "database": unquote(database),
    }


def _record_from_row(row: Any, event_rows: list[Any]) -> SessionRecord:
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
        pre_questionnaire=_parse_json_data(row["pre_questionnaire_json"]),
        post_questionnaire=_parse_json_data(row["post_questionnaire_json"]),
        analytics_dashboard=_parse_json_data(row["analytics_dashboard_json"]),
        events=[
            SessionEvent.model_validate(json.loads(event_row["event_json"]))
            for event_row in event_rows
        ],
        started_at=_parse_datetime(row["started_at"]) or datetime.now(UTC),
        completed_at=_parse_datetime(row["completed_at"]),
    )


def _bucket_event_rows(event_rows: list[Any]) -> dict[str, list[Any]]:
    bucketed: dict[str, list[Any]] = {}
    for event_row in event_rows:
        bucketed.setdefault(event_row["session_id"], []).append(event_row)
    return bucketed


def _next_sqlite_sequence_index(conn: sqlite3.Connection, session_id: str) -> int:
    row = conn.execute(
        """
        SELECT COALESCE(MAX(sequence_index) + 1, 0) AS next_sequence_index
        FROM session_events
        WHERE session_id = ?
        """,
        (session_id,),
    ).fetchone()
    return int(row["next_sequence_index"] if row is not None else 0)


def _next_mysql_sequence_index(cursor, session_id: str) -> int:
    cursor.execute(
        """
        SELECT COALESCE(MAX(sequence_index) + 1, 0) AS next_sequence_index
        FROM session_events
        WHERE session_id = %s
        """,
        (session_id,),
    )
    row = cursor.fetchone()
    return int(row["next_sequence_index"] if row is not None else 0)


def _ensure_column(conn: sqlite3.Connection, table_name: str, column_name: str, definition: str) -> None:
    columns = {
        row["name"]
        for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in columns:
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


def _ensure_mysql_column(cursor, table_name: str, column_name: str, definition: str) -> None:
    cursor.execute(f"SHOW COLUMNS FROM {table_name} LIKE %s", (column_name,))
    if cursor.fetchone() is None:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


def _backfill_sqlite_questionnaire_columns(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """
        SELECT session_id, event_type, event_json
        FROM session_events
        WHERE event_type IN (
            'pre_questionnaire_submitted',
            'post_reflection_submitted',
            'analytics_dashboard_generated'
        )
        ORDER BY sequence_index ASC
        """
    ).fetchall()
    for row in rows:
        column = _questionnaire_column(row["event_type"])
        if column is None:
            continue
        payload = _event_metadata_json(row["event_json"])
        if payload is None:
            continue
        conn.execute(
            f"""
            UPDATE sessions
            SET {column} = ?
            WHERE session_id = ? AND {column} IS NULL
            """,
            (payload, row["session_id"]),
        )


def _backfill_mysql_questionnaire_columns(cursor) -> None:
    cursor.execute(
        """
        SELECT session_id, event_type, event_json
        FROM session_events
        WHERE event_type IN (
            'pre_questionnaire_submitted',
            'post_reflection_submitted',
            'analytics_dashboard_generated'
        )
        ORDER BY sequence_index ASC
        """
    )
    for row in cursor.fetchall():
        column = _questionnaire_column(row["event_type"])
        if column is None:
            continue
        payload = _event_metadata_json(row["event_json"])
        if payload is None:
            continue
        cursor.execute(
            f"""
            UPDATE sessions
            SET {column} = %s
            WHERE session_id = %s AND {column} IS NULL
            """,
            (payload, row["session_id"]),
        )


def _questionnaire_column(event_type: str) -> str | None:
    if event_type == "pre_questionnaire_submitted":
        return "pre_questionnaire_json"
    if event_type == "post_reflection_submitted":
        return "post_questionnaire_json"
    if event_type == "analytics_dashboard_generated":
        return "analytics_dashboard_json"
    return None


def _event_metadata_json(event_json: str) -> str | None:
    try:
        event = json.loads(event_json)
    except json.JSONDecodeError:
        return None
    metadata = event.get("metadata")
    return _json_data(metadata) if isinstance(metadata, dict) else None


def _ensure_mysql_index(cursor, table_name: str, index_name: str, columns: str) -> None:
    cursor.execute(f"SHOW INDEX FROM {table_name} WHERE Key_name = %s", (index_name,))
    if cursor.fetchone() is None:
        cursor.execute(f"CREATE INDEX {index_name} ON {table_name} ({columns})")


def _fallback_participant_run_id(session_id: str) -> str:
    return f"run-{session_id}"


def _json(model) -> str:
    return json.dumps(model.model_dump(mode="json"), separators=(",", ":"))


def _json_data(value: dict[str, Any] | None) -> str | None:
    if value is None:
        return None
    return json.dumps(value, separators=(",", ":"))


def _parse_json_data(value: str | None) -> dict[str, Any] | None:
    if not value:
        return None
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _datetime(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _parse_datetime(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None
