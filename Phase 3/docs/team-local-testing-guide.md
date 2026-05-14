# Team Local Testing Guide

---
doc_type: Team Setup Guide
status: Draft
last_updated: 2026-05-09
system_area: Local Testing / Gemini / SQLite Logs
---

## Purpose

This guide explains how team members can run the simulator locally, test Gemini integration, and review event logs.

There are two testing modes:

- **Individual local testing:** each teammate runs their own backend, frontend, and SQLite database.
- **Shared QA testing:** one host machine runs the backend/frontend, and teammates open the same frontend URL so all events write to the host machine's SQLite database.

## 1. Gemini API Key

Create a Gemini API key from Google AI Studio:

```text
https://aistudio.google.com/app/apikey
```

The key should only be placed in the backend `.env` file. Do not put it in frontend code, GitHub, screenshots, or shared docs.

Backend env file:

```text
Phase 3/backend/.env
```

Minimum Gemini test settings:

```bash
SIMULATOR_APP_ENV=dev
SIMULATOR_STORAGE_BACKEND=sqlite
SIMULATOR_DATABASE_URL=sqlite:///simulator-dev.sqlite

SIMULATOR_LLM_PROVIDER=gemini
SIMULATOR_LLM_MODEL=gemini-2.5-flash-lite
SIMULATOR_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
SIMULATOR_LLM_API_KEY=PASTE_KEY_HERE

SIMULATOR_LLM_AGENT_ENABLED=true
SIMULATOR_LLM_CLASSIFIER_ENABLED=true
SIMULATOR_LLM_GRADER_ENABLED=false
SIMULATOR_ASSISTANT_FALLBACK_ENABLED=true
```

Restart the backend after changing `.env`.

## 2. Individual Local Testing

Use this when each teammate is testing independently.

Start backend:

```bash
cd "Phase 3/backend"
.venv/bin/uvicorn app.main:app --reload
```

Start frontend in another terminal:

```bash
cd "Phase 3/frontend"
npm run dev
```

Open:

```text
http://localhost:5173/
```

Admin dashboard:

```text
http://localhost:5173/admin
```

In this mode, each teammate has their own local SQLite file:

```text
Phase 3/backend/simulator-dev.sqlite
```

Logs are not automatically shared across teammates.

## 3. Shared QA Testing

Use this when several teammates should write logs into the same storage.

One person acts as the QA host. The host runs both backend and frontend. Everyone else opens the host's frontend URL.

Why this works:

```text
teammate browser
   -> host frontend URL
   -> host backend API
   -> host SQLite database
```

All events go to the host machine's `simulator-dev.sqlite` file because everyone is using the same backend.

### Host Step 1: Find Host IP

On the host machine:

```bash
ipconfig getifaddr en0
```

Example result:

```text
192.168.1.25
```

Use the returned IP in the commands below.

### Host Step 2: Start Backend On Network

```bash
cd "Phase 3/backend"
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Host Step 3: Start Frontend On Network

Replace `192.168.1.25` with the host machine IP:

```bash
cd "Phase 3/frontend"
VITE_API_BASE_URL=http://192.168.1.25:8000/api/v1 npm run dev -- --host 0.0.0.0
```

### Teammates Open

Replace `192.168.1.25` with the host machine IP:

```text
http://192.168.1.25:5173/
```

Admin dashboard:

```text
http://192.168.1.25:5173/admin
```

The host machine must stay awake and connected to the same network.

## 4. Testing The App

Basic test flow:

```text
1. Open the frontend URL.
2. Complete the pre-questionnaire.
3. Enter the desktop simulation.
4. Open notifications, mail, and source files.
5. Open the AI assistant.
6. Ask: "Can you compare the email with the source file?"
7. Attach/remove files if needed.
8. Complete the scenario.
9. Submit post-reflection.
10. Review logs in the admin dashboard.
```

Expected Gemini behavior:

- If Gemini works, assistant replies should be dynamic and scenario-aware.
- If Gemini is disabled or the key fails, fallback may produce deterministic scenario-bound replies.

## 5. Reviewing Logs

### Option A: Admin Dashboard

Use this while backend/frontend are running:

```text
http://localhost:5173/admin
```

or, for shared QA:

```text
http://HOST_IP:5173/admin
```

### Option B: SQLite GUI

Install a SQLite GUI such as:

```text
DB Browser for SQLite
DBeaver
TablePlus
DataGrip
```

Open:

```text
Phase 3/backend/simulator-dev.sqlite
```

Important tables:

```text
sessions
session_events
```

Do not manually edit the database during QA. Use it for review/export only.

## 6. Important Notes

- `.env` is hidden in Finder because it starts with a dot. Press `Command + Shift + .` to reveal hidden files.
- `.env` and `.sqlite` files should not be committed to Git.
- Individual local testing creates separate databases.
- Shared QA requires everyone to use the same host URL.
- Shared local QA is useful for team testing, but cloud dev storage is preferred for formal multi-person QA.
