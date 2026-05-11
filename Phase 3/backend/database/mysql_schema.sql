CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    participant_run_id VARCHAR(96) NOT NULL,
    episode_id VARCHAR(128) NOT NULL,
    environment VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    participant_profile_json LONGTEXT NOT NULL,
    participant_episode_json LONGTEXT NOT NULL,
    started_at VARCHAR(64) NOT NULL,
    completed_at VARCHAR(64) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_session_events_session_sequence
ON session_events(session_id, sequence_index);

CREATE INDEX idx_session_events_type_created
ON session_events(event_type, created_at);
