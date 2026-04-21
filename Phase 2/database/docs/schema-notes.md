# Schema Notes

This starter schema is intentionally explicit and research-oriented.

## Core tables

- `sessions`: participant/session lifecycle metadata
- `scenario_runs`: a scenario execution within a session, including current step and assigned condition
- `event_logs`: immutable event stream for analysis
- `agent_outputs`: structured agent recommendations shown to the human
- `human_actions`: human decision submissions with rationale
- `reflection_responses`: post-step or post-run reflection artifacts

## Modeling stance

- Keep `event_logs` append-only and analyzable.
- Preserve denormalized fields like `scenario_id` and `step_id` on event tables for faster analysis.
- Use `metadata_json` columns for evolving payloads without forcing constant schema churn.
- Keep scenario definitions in config files, not relational tables, until research definitions stabilize.

## Expected next DB tasks

- Add Alembic migrations for the initial schema.
- Decide whether `scenario_runs` should always be 1:1 with `sessions` in v1 or support multiple runs per session.
- Decide whether agent outputs should be stored only in `agent_outputs`, only in `event_logs`, or in both for analytics convenience.
- Add retention and partitioning strategy if event volume grows.

