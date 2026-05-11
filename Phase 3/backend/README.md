# Simulator Backend

This backend prototype implements the revised simulator direction:

1. **Level 1: rich episode packets** - scenarios are now workplace episodes with visible context, prior events, artifacts, hidden ground truth, agent capability boundaries, and scoring moments.
2. **Level 2: secondary/fallback LLM grading** - deterministic scoring runs first, then an LLM grader reviews the transcript against a versioned prompt template to cover outliers and rubric gaps when a provider is configured.
3. **Level 3: bounded assistant replies** - the chatbot records real user turns and can answer using only the episode packet. In offline/demo mode, a deterministic scenario fallback keeps the chat interactive without calling an external model.

The assistant is not an autonomous background agent in this phase. It is a scenario-bound participant-facing chatbot: every reply is constrained by the current episode packet and the visible artifacts.

## Run

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000/api/v1`.

## Local Environments

Use the example files to run the same environment split locally that the cloud deployment should use:

```bash
cp .env.dev.example .env
.venv/bin/uvicorn app.main:app --reload
```

- `dev` is for local development, QA/advisor testing, experiments, and test event logs. It exposes `draft`, `review_ready`, and `approved` episode packets.
- `prod` is for real participant sessions and production event logs. It exposes only `approved` episode packets.

## Storage

Local/offline runs can persist sessions and event logs to SQLite:

```bash
SIMULATOR_STORAGE_BACKEND=sqlite
SIMULATOR_DATABASE_URL=sqlite:///simulator-dev.sqlite
```

SQLite is the local default recommendation because it is a single file, needs no server, costs nothing, works offline, and is fast enough for QA/advisor testing.

When the server is offline, the SQLite file remains on disk. Admins can review it with the built-in dashboard while the server is running, export CSV, or open the file with a GUI client such as DB Browser for SQLite, DBeaver, TablePlus, or DataGrip. The main tables are `sessions` and `session_events`.

Do not commit populated `.sqlite` files. They contain local participant/test data. The backend automatically creates the database and tables on startup when `SIMULATOR_STORAGE_BACKEND=sqlite`. A committed blank schema is available at `database/schema.sql` for teams that want to initialize a local database manually.

Cloud runs can persist sessions and event logs to MySQL-compatible RDS:

```bash
SIMULATOR_STORAGE_BACKEND=mysql
SIMULATOR_DATABASE_URL=mysql://RDS_USERNAME:RDS_PASSWORD@RDS_ENDPOINT:3306/RDS_DATABASE_NAME
```

The backend automatically creates the required MySQL tables on startup. Use `.env.cloud-dev.example` for shared cloud QA and `.env.prod.example` for production-style configuration. Keep RDS credentials only in backend/server environment files, never in frontend code or GitHub.

## Key Endpoints

- `GET /api/v1/frontend-flow` describes the combined pre-questionnaire -> desktop simulation -> reflection -> analytics route order.
- `GET /api/v1/episodes` lists episode packets.
- `GET /api/v1/episodes/{episode_id}` returns the participant-safe view.
- `POST /api/v1/sessions` starts a session.
- `POST /api/v1/sessions/{session_id}/pre-questionnaire` records baseline survey answers before the desktop episode.
- `POST /api/v1/sessions/{session_id}/events` records messages, artifact opens, help requests, and final decisions.
- `POST /api/v1/sessions/{session_id}/agent-turn` records a user message and returns a bounded dynamic agent reply.
- `POST /api/v1/sessions/{session_id}/reflection` records post-simulation motivation/reflection answers.
- `POST /api/v1/sessions/{session_id}/complete` marks the scenario session complete.
- `POST /api/v1/sessions/{session_id}/score` returns deterministic scores plus the secondary/fallback LLM review status.

## Environment Flags

```bash
SIMULATOR_APP_ENV=dev
SIMULATOR_STORAGE_BACKEND=sqlite
SIMULATOR_DATABASE_URL=sqlite:///simulator-dev.sqlite
SIMULATOR_LLM_GRADER_ENABLED=false
SIMULATOR_LLM_AGENT_ENABLED=false
SIMULATOR_LLM_PROVIDER=disabled
SIMULATOR_LLM_MODEL=gemini-2.5-flash-lite
SIMULATOR_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
SIMULATOR_LLM_API_KEY=
SIMULATOR_ASSISTANT_FALLBACK_ENABLED=true
```

Use `SIMULATOR_APP_ENV=dev` for development/QA testing and `SIMULATOR_APP_ENV=prod` to expose only approved episodes.
Use `SIMULATOR_STORAGE_BACKEND=sqlite` for local/offline storage and `SIMULATOR_STORAGE_BACKEND=mysql` for MySQL RDS.
Use `SIMULATOR_LLM_PROVIDER=fixture` for deterministic test completions.
Use `SIMULATOR_LLM_PROVIDER=gemini`, `SIMULATOR_LLM_API_KEY`, and `SIMULATOR_LLM_MODEL` to call the Gemini Developer API through the native `generateContent` endpoint.
Use `SIMULATOR_LLM_PROVIDER=chat_completions`, `SIMULATOR_LLM_API_KEY`, `SIMULATOR_LLM_MODEL`, and `SIMULATOR_LLM_BASE_URL` for any provider that exposes a compatible chat-completions API.

## Prompt Assets

Prompt templates live in `../configs/prompts`. The important rule is that prompts are versioned backend assets, not ad hoc strings in route handlers.
