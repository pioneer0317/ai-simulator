# Human-Agent Team Simulator

Human-Agent Team Simulator is a local-first full-stack prototype for studying how humans interact with AI advisors inside realistic workplace scenarios. Phase 2 is now the canonical handoff target: the backend persists sessions, actions, reflections, and event logs; the frontend renders the actual scenario flow against the live API.

## Current scope

- Config-driven role, brief, decision, and reflection flow loaded from YAML
- Persisted FastAPI simulator API with session start, current step, action submission, reflection submission, and session summary retrieval
- Scenario catalog and CSV export endpoints for researcher review workflows
- Advisor grounding loaded from YAML so step outputs stay stable and reviewable
- SQLite default for easy local startup, with Postgres-compatible SQLAlchemy models for later deployment hardening
- Next.js frontend wired to the live backend contract

## Repository layout

```text
.
├── backend/                 FastAPI app, services, schemas, DB layer
├── frontend/                Next.js app-router frontend
├── configs/scenarios/       YAML scenario definitions
├── database/docs/           Schema handoff notes
└── docker-compose.yml       Local PostgreSQL
```

## Architecture decisions

### Backend owns simulation control

The backend is the source of truth for:

- session lifecycle
- scenario progression
- agent execution
- event logging
- future condition assignment

The frontend only renders the current state and sends user inputs back to the API.

### Advisor behavior is intentionally explicit

The current simulator uses scenario-authored advisor outputs rather than generating live LLM responses on every request. This keeps the research experience reproducible and makes it easy to audit exactly what each participant saw.

### Scenario logic stays out of the UI

Scenario definitions live in YAML under `configs/scenarios/`. This keeps research-authored scenario content separate from application logic and lets the team add new scenarios without rewriting frontend code.

### Event logging is a first-class concern

The runtime service logs step views, agent outputs, human actions, rationales, reflections, and scenario completion. The relational schema mirrors that event-centric design so analytics and downstream research workflows have a stable foundation.

## Implemented backend API

- `GET /api/v1/health`
- `GET /api/v1/simulator/scenarios`
- `POST /api/v1/simulator/sessions`
- `GET /api/v1/simulator/sessions/{session_id}/current-step`
- `POST /api/v1/simulator/sessions/{session_id}/actions`
- `POST /api/v1/simulator/sessions/{session_id}/reflection`
- `GET /api/v1/simulator/sessions/{session_id}/summary`
- `GET /api/v1/simulator/sessions/{session_id}/export?view=steps|events`

## Current authored scenario set

- `cisco_product_launch_v1`: multi-agent conflict and accountability under launch pressure
- `false_certainty_trap_v1`: precise AI forecast with incomplete evidence
- `context_hoarder_crisis_v1`: missing human context causes false anomaly escalation
- `governance_bypass_v1`: escalation controls under executive urgency pressure

## Local setup

### 1. Run the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. Run the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The frontend expects the backend at `http://localhost:8000/api/v1`.

## Where each teammate can start

### Backend engineer

- `backend/app/services/simulator.py`
- `backend/app/services/scenarios/`
- `backend/app/services/agents/`

### Data engineer

- `backend/app/db/models/`
- `backend/app/db/session.py`
- `database/docs/schema-notes.md`

### Frontend engineer

- `frontend/src/app/simulator/page.tsx`
- `frontend/src/components/simulator/`
- `frontend/src/lib/api.ts`

## Known current limitations

- The live scenario content is still limited to the currently authored YAML set.
- Alembic migrations have not been added yet.
- Some older scaffold modules remain in the repo for future extension, but the canonical flow lives in `backend/app/services/simulator.py` and the frontend simulator components.

## Version 2 enhancements

- Replace in-memory stores with repository-backed Postgres persistence.
- Add Alembic migrations and seed flows.
- Add experiment condition assignment and condition-aware scenario variants.
- Add authentication or researcher/admin session controls if needed.
- Add richer analytics endpoints and event export tooling.
- Add real LLM-backed agents behind the existing agent interface.
- Add retrieval support for scenario attachments or policy documents.
- Add scenario authoring validation and test fixtures for research handoff.
