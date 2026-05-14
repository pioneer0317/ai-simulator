# Phase 3: Embedded Enterprise-Agent Simulator

Phase 3 implements the revised direction from the week 5 discussion: the simulator should feel less like a generic chatbot and more like a short workplace episode where an enterprise agent is embedded in the user's flow of work.

## What Changed From Phase 2

Phase 2 scenarios are mostly step/action flows:

```text
choose role -> read brief -> see advisor outputs -> choose action -> reflect -> score
```

Phase 3 episodes are richer packets:

```text
enter workplace episode
-> review prior agent activity, messages, documents, dashboards
-> interact with the agent and artifacts
-> submit a decision or stakeholder response
-> deterministic scoring
-> secondary/fallback LLM grading review
```

This preserves the current backend idea that scenarios are defined in configuration, but the unit of work is now an **episode packet** rather than a simple decision step.

## Level 1 Implemented

Level 1 is the no-LLM foundation:

- rich YAML episode packets
- participant-visible and evaluator-only context
- workplace artifacts such as email, dashboard excerpts, prior AI output, and system notes
- prelude timeline events so the user enters a situation already in motion
- scoring moments tied to research dimensions
- deterministic rubric scoring over messages, artifact opens, help requests, and decisions

The first review-ready episode is:

- `configs/episodes/stakeholder_report_error.yaml`

## Level 2 Implemented

Level 2 adds a secondary/fallback LLM grading layer:

- prompt template: `configs/prompts/dimension_grader.md`
- provider-neutral `LLMClient` interface
- runtime-configured LLM grader
- fixture client for tests/development
- JSON parser and failure fallback

The LLM grader is the second-pass fallback reviewer after deterministic scoring. It should cover outliers and rubric gaps, explain nuance, and suggest rubric improvements; it does not replace the deterministic scoring system.

## Live Semantic Classifier Implemented

The backend also has a hidden live semantic-classifier role for finalized Scenario 1:

- prompt template: `configs/prompts/scenario1_semantic_classifier.md`
- service: `backend/app/services/llm/classifier.py`
- event trail: raw participant event plus `semantic_classification` evaluator event
- deterministic fallback: `backend/app/scenarios/scenario_1/uncertainty.py`

Set `SIMULATOR_LLM_CLASSIFIER_ENABLED=true` with a configured provider to classify paraphrased participant answers through the LLM. If it is disabled or returns unusable JSON, the backend falls back to deterministic Scenario 1 rules.

## Level 3 Implemented

Level 3 adds a bounded dynamic enterprise-agent response path:

- prompt template: `configs/prompts/enterprise_agent_response.md`
- endpoint: `POST /api/v1/sessions/{session_id}/agent-turn`
- user message and generated agent reply are both logged as session events
- agent context is built from agent-visible episode artifacts, timeline events, response contract, and scenario resolution facts
- the agent is instructed to use only provided scenario facts and refuse unavailable information

For real LLM runs, set `SIMULATOR_LLM_AGENT_ENABLED=true`, `SIMULATOR_LLM_CLASSIFIER_ENABLED=true`, and `SIMULATOR_LLM_GRADER_ENABLED=true` with a configured provider/API key. Tests use the fixture provider.

## Dev / Prod Behavior

Phase 3 now reads `SIMULATOR_APP_ENV`:

- `dev` exposes `draft`, `review_ready`, and `approved` episodes.
- `prod` exposes only `approved` episodes.

This keeps incomplete scenarios out of real participant collection while allowing the team to iterate quickly in development.

## Prompt Engineering Approach

We do not need one script for every model. We need one versioned prompt template per **LLM role**.

Current role:

- `dimension_grader`: scores a completed episode transcript after deterministic scoring.
- `enterprise_agent_response`: generates a bounded in-scenario assistant reply.

Future roles:

- `scenario_authoring_assistant`: help the team draft new episode packets.
- `rubric_refinement_assistant`: suggest new deterministic signals from reviewed transcripts.

Keeping prompts as files makes them reviewable by product/research and safer to version than strings hidden inside route code.

## Backend

See `backend/README.md`.

For a focused explanation of the chatbot, LLM grader, provider configuration, prompt templates, and fallback path, see `LLM_ARCHITECTURE.md`.
