PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    environment TEXT NOT NULL,
    status TEXT NOT NULL,
    participant_profile_json TEXT NOT NULL,
    participant_episode_json TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT
);

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
);

CREATE INDEX IF NOT EXISTS idx_session_events_session_sequence
ON session_events(session_id, sequence_index);

CREATE INDEX IF NOT EXISTS idx_session_events_type_created
ON session_events(event_type, created_at);
