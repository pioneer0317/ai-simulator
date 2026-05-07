# Local SQLite Database

Do not commit a populated `.sqlite` file. The backend creates the SQLite database automatically from the application schema the first time it starts with SQLite enabled.

For local development:

```bash
cp .env.dev.example .env
.venv/bin/uvicorn app.main:app --reload
```

This creates `simulator-dev.sqlite` beside the backend code. That file stores local QA sessions and event logs, but it is ignored by Git because it is runtime data.

For a blank database without starting the API:

```bash
sqlite3 simulator-dev.sqlite < database/schema.sql
```

For production/cloud, use a separate production database target. The same tables are required, but real participant logs should not share the dev database.
