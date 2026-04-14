# Phase 1 Backbone

## Goal

Phase 1 is the minimum viable simulator backend.

It is intentionally a simple monolith:

- one FastAPI backend
- one relational database
- YAML scenario configs
- YAML advisor configs
- no multi-agent orchestration
- no retrieval
- no prompt admin UI
- no background workers

The product in phase 1 is the simulator loop itself, not an advanced agent system.

## Core Flow

```text
role -> brief -> decide -> reflect -> stored data
```

What this means in practice:

1. Load a scenario step from YAML.
2. Show the role-selection, brief, or decide content for that step.
3. Capture the participant's action and any UI metadata.
4. If the step requires reflection, capture reflection data.
5. Store the session state, step response, and event log.
6. Advance to the next step or complete the session.

## Advisor Roles

The current phase 1 advisors are aligned to both the `Innovate` research materials and the teammate prototype screens.

### `AI Analyst`

- launch-oriented analysis advisor
- grounded in `Mike the Situation`
- argues for action, speed, and market opportunity

### `AI Risk Monitor`

- anomaly and instability monitoring advisor
- grounded in `The Drifter`
- argues for caution, delay, and stronger evidence before launch

## Backend Architecture

```text
Frontend / prototype
  -> FastAPI API
    -> Simulator service
    -> Scenario loader
    -> Advisor registry
    -> SQLAlchemy persistence
  -> PostgreSQL or SQLite
  -> YAML configs on disk
```

## Phase 1 Component Map

This section is the quick orientation guide for anyone opening the Phase 1 folder for the first time.

```text
Phase 1/
├── PHASE1_BACKBONE.md
├── CONFIG_FIELD_DEFINITIONS.md
├── backend/
│   ├── README.md
│   ├── pyproject.toml
│   ├── .env.example
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes/
│   │   │   ├── health.py
│   │   │   └── simulator.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── models.py
│   │   │   └── session.py
│   │   ├── schemas/
│   │   │   ├── advisors.py
│   │   │   ├── scenario.py
│   │   │   └── sessions.py
│   │   └── services/
│   │       ├── advisors.py
│   │       ├── scenarios.py
│   │       └── simulator.py
│   ├── tests/api/
│   │   ├── test_health.py
│   │   └── test_simulator.py
│   └── phase1.db
├── configs/
│   ├── advisors/
│   │   ├── drifter.yaml
│   │   └── situation_analyst.yaml
│   └── scenarios/
│       └── cisco_product_launch.yaml
└── database/docs/
    └── schema-notes.md
```

### Top Level

#### `PHASE1_BACKBONE.md`

- the architecture overview for the whole phase
- explains the simulator flow, system boundaries, and database design

#### `CONFIG_FIELD_DEFINITIONS.md`

- reference doc for the YAML config schema
- explains what each scenario and advisor field means

### `backend/`

The runnable application code for phase 1.

#### `backend/README.md`

- local setup instructions for running the backend
- explains the default API prefix and environment expectations

#### `backend/pyproject.toml`

- Python project definition
- declares app dependencies, dev dependencies, and test tooling

#### `backend/.env.example`

- starter environment variables for local development
- shows what can be configured without changing code

#### `backend/phase1.db`

- local SQLite database file created during development
- useful for quick inspection of persisted phase 1 session data

### `backend/app/`

The actual FastAPI application package.

#### `backend/app/main.py`

- app assembly and startup entry point
- creates the FastAPI app, enables CORS, builds the database engine, initializes services, creates tables, and registers routers

### `backend/app/api/`

The HTTP layer that exposes backend functionality to the frontend.

#### `backend/app/api/routes/health.py`

- minimal health check endpoint
- useful for frontend connectivity checks, local dev validation, and deployment smoke tests

#### `backend/app/api/routes/simulator.py`

- main simulator API routes
- converts HTTP requests into service calls for starting sessions, fetching the current step, submitting actions, submitting reflections, and reading summaries
- maps domain errors into HTTP status codes

### `backend/app/core/`

Shared application-level configuration and setup helpers.

#### `backend/app/core/config.py`

- central settings model for the app
- defines API prefix, frontend origin, database URL, default scenario, and config directories
- loads values from environment variables and resolves config paths

### `backend/app/db/`

Persistence layer definitions for SQLAlchemy.

#### `backend/app/db/base.py`

- defines the shared SQLAlchemy declarative base
- all database models inherit from this base

#### `backend/app/db/models.py`

- the main database schema file
- defines the `sessions`, `step_responses`, and `event_logs` tables plus indexes and timestamp fields

#### `backend/app/db/session.py`

- database session factory utilities
- creates SQLAlchemy sessions and provides the session lifecycle helper used by the app

### `backend/app/schemas/`

Pydantic models for validated config data and API contracts.

#### `backend/app/schemas/advisors.py`

- defines advisor metadata and advisor output shapes
- used when advisor YAML is loaded and when advisor cards are returned to the frontend

#### `backend/app/schemas/scenario.py`

- defines the validated shape of scenario YAML files
- models actions, step-level advisor templates, branching rules, and complete scenario definitions

#### `backend/app/schemas/sessions.py`

- defines request and response models for the simulator API
- includes start-session payloads, step views, action/reflection requests, and session summary responses

### `backend/app/services/`

Business logic layer for the simulator.

#### `backend/app/services/advisors.py`

- loads advisor YAML files into memory at startup
- validates them into structured Python models and returns advisor definitions by ID

#### `backend/app/services/scenarios.py`

- loads scenario YAML files into memory at startup
- validates scenario structure, returns scenarios by ID, finds steps by `step_id`, and resolves the next step from branching rules

#### `backend/app/services/simulator.py`

- the core phase 1 simulator engine
- creates tables, starts sessions, snapshots steps, records decisions, records reflections, advances the scenario, updates session metadata, and writes append-only event logs
- also defines the simulator-specific error classes used by the API layer

### `backend/tests/`

Backend verification for the current phase 1 behavior.

#### `backend/tests/api/test_health.py`

- checks that the health endpoint responds successfully
- confirms the app boots with a temporary SQLite database

#### `backend/tests/api/test_simulator.py`

- end-to-end API test for the phase 1 simulator loop
- verifies session start, step retrieval, role selection, branching, reflection ordering, completion, summary generation, and completed-session guardrails

### `configs/`

Static configuration files that drive simulator behavior without changing backend code.

#### `configs/advisors/drifter.yaml`

- advisor definition for the caution-oriented perspective
- stores the identity, role, source grounding, and prompt metadata for that advisor

#### `configs/advisors/situation_analyst.yaml`

- advisor definition for the action-oriented perspective
- stores the identity, role, source grounding, and prompt metadata for that advisor

#### `configs/scenarios/cisco_product_launch.yaml`

- the scenario blueprint used by phase 1
- defines the participant role flow, step content, advisor messages, available actions, branching, and reflection prompts

### `database/docs/`

Database notes that sit alongside the implementation.

#### `database/docs/schema-notes.md`

- supporting notes for the schema and table design
- useful when explaining why the current tables exist and how they may evolve

### Main backend responsibilities

#### API layer

- start a session
- fetch current step
- submit action
- submit reflection
- fetch session summary

#### Scenario engine

- load scenario definitions from YAML
- validate actions for the current step
- resolve next step based on branching

#### Advisor layer

- load advisor definitions from YAML
- attach advisor identity and metadata to scenario-defined outputs
- no LLM orchestration yet

#### Persistence layer

- store one row per session
- store one row per visited step
- append event log entries for the important timeline

## Database Design

Phase 1 uses only three tables:

### `sessions`

One row per simulator run.

Fields:

- `session_id`
- `participant_id`
- `scenario_id`
- `current_step_id`
- `status`
- `metadata_json`
- `started_at`
- `completed_at`

### `step_responses`

One row per step shown to a participant.

Fields:

- `step_response_id`
- `session_id`
- `step_id`
- `advisor_outputs_json`
- `chosen_action_id`
- `rationale`
- `reflection_text`
- `reflection_confidence`
- `shown_at`
- `decision_submitted_at`
- `reflection_submitted_at`

### `event_logs`

Append-only timeline of what happened.

Fields:

- `event_id`
- `session_id`
- `step_id`
- `event_type`
- `payload_json`
- `created_at`

## Current Event Types

The current backbone emits:

- `session_started`
- `step_viewed`
- `action_submitted`
- `reflection_submitted`
- `session_completed`

## API Endpoints

### `POST /api/v1/sessions`

Starts a session and returns:

- `session_id`
- `scenario_id`
- `current_step_id`
- `status`

### `GET /api/v1/sessions/{id}/step`

Returns:

- scenario metadata
- current step
- advisor outputs
- action choices
- completion state

### `POST /api/v1/sessions/{id}/action`

Captures:

- selected action
- optional rationale

### `POST /api/v1/sessions/{id}/reflection`

Captures:

- reflection text
- optional confidence

Also advances the scenario after reflection is stored.

### `GET /api/v1/sessions/{id}/summary`

Returns the complete stored session result:

- session status
- step responses
- event logs

## Config Ownership

### Backend engineer

- API contracts
- simulator flow
- scenario engine
- advisor layer
- event emission

### Data engineer

- schema refinement
- migrations
- indexes
- downstream analytics queries
- recommendations for future event taxonomy changes

### Prototype / Figma team

- step flow
- advisor card layout
- rationale / reflection UI
- summary screen

## Files

Main implementation files:

- [backend/app/main.py](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/backend/app/main.py)
- [backend/app/services/simulator.py](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/backend/app/services/simulator.py)
- [backend/app/db/models.py](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/backend/app/db/models.py)
- [configs/scenarios/cisco_product_launch.yaml](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/configs/scenarios/cisco_product_launch.yaml)
- [configs/advisors/situation_analyst.yaml](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/configs/advisors/situation_analyst.yaml)
- [configs/advisors/drifter.yaml](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/configs/advisors/drifter.yaml)
- [database/docs/schema-notes.md](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/database/docs/schema-notes.md)
