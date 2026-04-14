# AI Simulator Phase 1 Backend

This phase 1 backend is the minimal monolith for the simulator:

- FastAPI API
- SQLAlchemy persistence
- Postgres-compatible schema
- YAML scenario configs
- YAML advisor configs

## Local setup

```bash
cd "Phase 1/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The API defaults to `/api/v1`.

## Environment

`DATABASE_URL` can point to PostgreSQL for normal development. Example:

```bash
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_simulator_phase1
```

Tests use SQLite and do not require Postgres.
