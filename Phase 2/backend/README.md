# Backend

FastAPI backend for the canonical Phase 2 simulator.

## What this backend now does

- loads real simulator scenarios from YAML
- loads advisor grounding from YAML
- persists sessions, actions, reflections, advisor outputs, and event logs
- exposes the current-step API used by the Next.js simulator UI
- exposes a session summary endpoint for research review and export
- exposes a scenario catalog plus step/event CSV exports for analyst workflows

## Main entry points

- `app/main.py`: app assembly and dependency wiring
- `app/services/simulator.py`: canonical simulator runtime
- `app/services/scenarios/`: scenario loading and branching
- `app/services/advisors.py`: advisor registry
- `tests/api/test_simulator.py`: end-to-end API verification
