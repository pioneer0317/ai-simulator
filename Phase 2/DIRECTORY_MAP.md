# Phase 2 Directory Map

This is the handoff-oriented map for the canonical `Phase 2` app.

Notes:
- Focus is on source, config, tests, and docs that matter for engineering handoff.
- Generated folders such as `frontend/.next/`, `frontend/node_modules/`, `backend/.venv/`, and Python `__pycache__/` folders are intentionally summarized instead of expanded.
- A few older scaffold files still exist; those are marked as `legacy` or `placeholder` where relevant.

## Top Level

```text
Phase 2/
├── README.md
├── DIRECTORY_MAP.md
├── docker-compose.yml
├── configs/
├── backend/
├── frontend/
└── database/
```

- [README.md](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/README.md>): Main handoff README for the canonical Phase 2 app.
- [DIRECTORY_MAP.md](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/DIRECTORY_MAP.md>): This file; explains the repo structure for the team/company handoff.
- [docker-compose.yml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/docker-compose.yml>): Local Docker setup, mainly for database-related local development.

## Configs

```text
configs/
├── advisors/
└── scenarios/
```

### `configs/advisors`

- [drifter.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/advisors/drifter.yaml>): Advisor identity and grounding for the risk/drift-oriented voice used in scenarios.
- [guardrail_auditor.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/advisors/guardrail_auditor.yaml>): Advisor definition for governance and control-layer reasoning.
- [predictor.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/advisors/predictor.yaml>): Advisor definition for forecast-heavy, confidence-signaling recommendations.
- [situation_analyst.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/advisors/situation_analyst.yaml>): Advisor definition for fast-moving operational/business tradeoff analysis.

### `configs/scenarios`

- [cisco_product_launch.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/scenarios/cisco_product_launch.yaml>): Multi-agent conflict/accountability scenario used as the canonical default path.
- [context_hoarder_crisis.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/scenarios/context_hoarder_crisis.yaml>): Scenario about missing human context causing false anomaly interpretation.
- [false_certainty_trap.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/scenarios/false_certainty_trap.yaml>): Scenario about overtrusting precise AI outputs built on incomplete evidence.
- [governance_bypass.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/scenarios/governance_bypass.yaml>): Scenario about bypassing escalation/governance controls under pressure.

## Backend

```text
backend/
├── README.md
├── .env.example
├── pyproject.toml
├── phase2.db
├── tests/
└── app/
```

- [README.md](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/README.md>): Short backend-focused handoff notes.
- [.env.example](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/.env.example>): Example environment variables for local backend startup.
- [pyproject.toml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/pyproject.toml>): Python package metadata and backend dependency list.
- [phase2.db](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/phase2.db>): Local SQLite database created during development/testing.

### `backend/app`

```text
app/
├── main.py
├── api/
├── core/
├── db/
├── integrations/
├── schemas/
└── services/
```

- [main.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/main.py>): FastAPI app assembly; wires routes, CORS, scenario loader, advisor registry, and canonical simulator service.

### `backend/app/api`

```text
api/
├── __init__.py
├── dependencies/
└── routes/
```

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/api/__init__.py>): Package marker for API modules.

#### `backend/app/api/dependencies`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/api/dependencies/__init__.py>): Package marker for dependency helpers.
- [services.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/api/dependencies/services.py>): FastAPI dependency that exposes the app-scoped `SimulatorService`.

#### `backend/app/api/routes`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/api/routes/__init__.py>): Package marker for route modules.
- [health.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/api/routes/health.py>): Minimal health-check endpoint.
- [simulator.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/api/routes/simulator.py>): Canonical simulator API routes for scenario catalog, sessions, actions, reflection, summary, and CSV export.

### `backend/app/core`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/core/__init__.py>): Package marker for shared core utilities.
- [config.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/core/config.py>): Central settings object; defines DB URL, config directories, frontend origin, and default scenario.
- [logging.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/core/logging.py>): Basic Python logging setup for backend startup/runtime.

### `backend/app/db`

```text
db/
├── base.py
├── init_db.py
├── session.py
└── models/
```

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/__init__.py>): Package marker for DB code.
- [base.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/base.py>): SQLAlchemy declarative base and model imports for metadata registration.
- [init_db.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/init_db.py>): Small utility for creating all tables from the ORM models.
- [session.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/session.py>): SQLAlchemy engine/session factory helpers used by the backend.

#### `backend/app/db/models`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/models/__init__.py>): Package marker for ORM models.
- [agent_output.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/models/agent_output.py>): Stores the advisor outputs shown on each session step.
- [event_log.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/models/event_log.py>): Append-only event log table for step views, actions, reflections, and completion.
- [human_action.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/models/human_action.py>): Stores participant decisions and optional rationale.
- [reflection_response.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/models/reflection_response.py>): Stores post-decision reflections and confidence.
- [scenario_run.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/models/scenario_run.py>): Future-facing model for richer run/condition assignment; not central to the current canonical flow.
- [session.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/db/models/session.py>): Canonical top-level simulator session record.

### `backend/app/integrations`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/integrations/__init__.py>): Package marker for external integration code.

#### `backend/app/integrations/llm`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/integrations/llm/__init__.py>): Package marker for LLM integration stubs.
- [client.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/integrations/llm/client.py>): Placeholder client interface for future external LLM integration; not wired into v1.

### `backend/app/schemas`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/schemas/__init__.py>): Package marker for Pydantic schemas.
- [advisors.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/schemas/advisors.py>): Pydantic models for advisor definitions and advisor outputs.
- [agents.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/schemas/agents.py>): Legacy/placeholder schemas for the older agent-runner scaffold.
- [events.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/schemas/events.py>): Legacy event schema models from the earlier scaffold layer.
- [scenario.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/schemas/scenario.py>): Pydantic models for scenario YAML files and the scenario catalog response.
- [sessions.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/schemas/sessions.py>): Pydantic request/response models for sessions, actions, reflections, summaries, and exports.

### `backend/app/services`

```text
services/
├── simulator.py
├── advisors.py
├── scenarios/
├── sessions/
├── agents/
├── conditions/
├── events/
└── retrieval/
```

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/__init__.py>): Package marker for backend services.
- [advisors.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/advisors.py>): Loads advisor YAML files and exposes them by `advisor_id`.
- [simulator.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/simulator.py>): Canonical runtime service; owns session lifecycle, step progression, persistence, summaries, and CSV export.

#### `backend/app/services/scenarios`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/scenarios/__init__.py>): Package marker for scenario services.
- [engine.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/scenarios/engine.py>): Tiny state-machine helper for ordered and branching scenario steps.
- [loader.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/scenarios/loader.py>): Loads and validates scenario YAML files into memory.

#### `backend/app/services/sessions`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/sessions/__init__.py>): Package marker for session store code.
- [store.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/sessions/store.py>): Legacy in-memory session store from the earlier scaffold; superseded by the persisted simulator service.

#### `backend/app/services/agents`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/agents/__init__.py>): Package marker for placeholder agents.
- [base.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/agents/base.py>): Abstract base class for the older deterministic agent scaffold.
- [ops.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/agents/ops.py>): Placeholder operations-oriented agent implementation.
- [orchestrator_agent.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/agents/orchestrator_agent.py>): Placeholder coordination/synthesis agent implementation.
- [policy.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/agents/policy.py>): Placeholder governance/policy agent implementation.
- [risk.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/agents/risk.py>): Placeholder risk-oriented agent implementation.
- [runner.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/agents/runner.py>): Legacy helper that runs the placeholder agent set; not used by the canonical YAML-authored advisor flow.

#### `backend/app/services/conditions`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/conditions/__init__.py>): Package marker for condition assignment code.
- [service.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/conditions/service.py>): Placeholder service for future experimental condition assignment.

#### `backend/app/services/events`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/events/__init__.py>): Package marker for event helpers.
- [logger.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/events/logger.py>): Older in-memory event logger scaffold; current canonical logging happens in the DB via `SimulatorService`.

#### `backend/app/services/retrieval`

- [__init__.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/retrieval/__init__.py>): Package marker for retrieval helpers.
- [service.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/retrieval/service.py>): Placeholder retrieval service for future document/policy context injection.

### `backend/tests`

```text
tests/
└── api/
```

- [test_health.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/tests/api/test_health.py>): Verifies that the health endpoint responds correctly.
- [test_simulator.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/tests/api/test_simulator.py>): End-to-end API tests for session lifecycle, summaries, scenario catalog, and CSV exports.

### Generated / local backend artifacts

- `backend/.venv/`: Local Python virtual environment; generated locally.
- `backend/.pytest_cache/`: Pytest cache; generated locally.
- `backend/human_agent_team_simulator_backend.egg-info/`: Packaging metadata generated by editable installs.
- `backend/app/__pycache__/` and similar: Python bytecode caches; generated locally.
- `.DS_Store` files: macOS Finder metadata; not part of the app logic.

## Frontend

```text
frontend/
├── README.md
├── .env.local.example
├── package.json
├── package-lock.json
├── next.config.mjs
├── next-env.d.ts
├── tsconfig.json
└── src/
```

- [README.md](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/README.md>): Frontend-specific notes from the scaffolded Next.js app.
- [.env.local.example](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/.env.local.example>): Example frontend environment variables.
- [package.json](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/package.json>): Frontend dependency list and npm scripts.
- [package-lock.json](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/package-lock.json>): Locked frontend dependency tree.
- [next.config.mjs](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/next.config.mjs>): Next.js configuration.
- [next-env.d.ts](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/next-env.d.ts>): Next.js TypeScript typing bootstrap file.
- [tsconfig.json](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/tsconfig.json>): TypeScript compiler configuration for the frontend.

### `frontend/src`

```text
src/
├── app/
├── components/
├── hooks/
└── lib/
```

### `frontend/src/app`

- [globals.css](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/app/globals.css>): Global styles for the simulator UI, launcher cards, and shared layout.
- [layout.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/app/layout.tsx>): Root Next.js layout and page metadata.
- [page.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/app/page.tsx>): Home/launcher page that introduces the app and renders the scenario catalog.

#### `frontend/src/app/simulator`

- [page.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/app/simulator/page.tsx>): Simulator route wrapper; mounts the live simulator client inside a `Suspense` boundary.

### `frontend/src/components/layout`

- [AppShell.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/layout/AppShell.tsx>): Shared page shell that constrains width and provides consistent layout spacing.

### `frontend/src/components/home`

- [ScenarioLauncher.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/home/ScenarioLauncher.tsx>): Fetches the scenario catalog from the backend and renders launch cards for each scenario.

### `frontend/src/components/simulator`

- [AgentPanel.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/simulator/AgentPanel.tsx>): Shows the advisor outputs visible on the current step.
- [DecisionPanel.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/simulator/DecisionPanel.tsx>): Renders step actions and optional rationale input before submission.
- [ReflectionPanel.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/simulator/ReflectionPanel.tsx>): Captures post-decision reflection text and confidence.
- [ResearchSummaryPanel.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/simulator/ResearchSummaryPanel.tsx>): Shows the final session summary and links to JSON/CSV exports.
- [ScenarioPanel.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/simulator/ScenarioPanel.tsx>): Displays scenario context, human role, and current step information.
- [SimulatorClient.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/simulator/SimulatorClient.tsx>): Main client-side simulator container; reads the `scenarioId` query param and coordinates all panels.
- [StatusPanel.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/simulator/StatusPanel.tsx>): Shows session metadata, notices, errors, and current run state.

### `frontend/src/hooks`

- [useSimulatorSession.ts](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/hooks/useSimulatorSession.ts>): Main frontend state hook; starts sessions, fetches steps, submits actions/reflections, and loads session summaries.

### `frontend/src/lib`

- [api.ts](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/lib/api.ts>): Thin API client for the backend simulator endpoints and docs URL helper.
- [types.ts](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/lib/types.ts>): Shared TypeScript types matching the backend API contract.

### Generated / local frontend artifacts

- `frontend/.next/`: Next.js build output; generated locally.
- `frontend/node_modules/`: Installed frontend dependencies; generated locally.

## Database Docs

```text
database/
└── docs/
```

- [schema-notes.md](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/database/docs/schema-notes.md>): Notes about the database schema and how the data model is intended to evolve.

## Quick Orientation

If someone new is onboarding, the shortest useful reading path is:

1. [README.md](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/README.md>)
2. [frontend/src/app/page.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/app/page.tsx>)
3. [frontend/src/components/home/ScenarioLauncher.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/home/ScenarioLauncher.tsx>)
4. [frontend/src/components/simulator/SimulatorClient.tsx](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/components/simulator/SimulatorClient.tsx>)
5. [frontend/src/hooks/useSimulatorSession.ts](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/hooks/useSimulatorSession.ts>)
6. [frontend/src/lib/api.ts](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/frontend/src/lib/api.ts>)
7. [backend/app/api/routes/simulator.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/api/routes/simulator.py>)
8. [backend/app/services/simulator.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/simulator.py>)
9. [backend/app/services/scenarios/loader.py](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/backend/app/services/scenarios/loader.py>)
10. [configs/scenarios/cisco_product_launch.yaml](</Users/hanalim/Documents/Github/AI Simulator/Phase 2/configs/scenarios/cisco_product_launch.yaml>)
