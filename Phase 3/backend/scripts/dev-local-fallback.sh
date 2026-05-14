#!/usr/bin/env bash
set -euo pipefail

export SIMULATOR_LLM_AGENT_ENABLED=false
export SIMULATOR_LLM_CLASSIFIER_ENABLED=false
export SIMULATOR_LLM_GRADER_ENABLED=false
export SIMULATOR_LLM_PROVIDER=disabled
export SIMULATOR_ASSISTANT_FALLBACK_ENABLED=true

exec .venv/bin/uvicorn app.main:app --reload --port "${PORT:-8000}"
