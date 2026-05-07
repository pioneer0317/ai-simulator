# LLM Architecture

This document explains how Phase 3 uses LLMs for the participant-facing chatbot and the optional post-session grader. The main design choice is that both LLM paths are bounded by the episode packet. The model is not treated as a free agent with open access to company data, email, files, or the internet.

## High-Level Flow

```text
Participant message
   ->
Frontend chat UI
   ->
Backend /agent-turn endpoint
   ->
Session transcript + episode packet + prompt template
   ->
Configured LLM client, or deterministic fallback
   ->
Assistant response
   ->
Persist user and assistant events
   ->
Render response in the desktop simulation UI
```

Scoring follows a related but separate path:

```text
Completed session
   ->
Backend /score endpoint
   ->
Deterministic scorer
   ->
Optional LLM grader review
   ->
Score response for analysis/admin use
```

## Two Separate LLM Components

### 1. Participant-Facing Assistant

The assistant is used during the interactive desktop simulation through:

```text
POST /api/v1/sessions/{session_id}/agent-turn
```

The implementation is split across:

- `frontend/src/desktop/components/agent-chat.tsx`: captures chat input and renders the assistant reply.
- `frontend/src/app/pages/DesktopSimulationPage.tsx`: passes chat messages to the backend.
- `frontend/src/app/lib/simulatorApi.ts`: calls `/sessions/{session_id}/agent-turn`.
- `backend/app/api/routes/episodes.py`: exposes the route.
- `backend/app/services/sessions.py`: records the participant message, calls the assistant responder, records the assistant reply, and returns the response.
- `backend/app/services/llm/agent.py`: builds the bounded assistant prompt.
- `configs/prompts/enterprise_agent_response.md`: prompt template for the assistant.

When enabled, this assistant can respond to varied wording, follow-up questions, summary requests, tone requests, and drafting help. It still has to stay inside the scenario contract. For example, if the participant asks Mira, "Can you check which number is right?", the backend gives Mira the episode context that says the sent summary used `3%`, the source dashboard says `13%`, and the dashboard is the stronger source for the immediate correction.

### 2. Evaluator/Grader LLM

The grader is used after the session through:

```text
POST /api/v1/sessions/{session_id}/score
```

The implementation is split across:

- `backend/app/api/routes/episodes.py`: exposes the route.
- `backend/app/services/sessions.py`: runs deterministic scoring, then optional LLM review.
- `backend/app/services/scoring/deterministic.py`: computes rule-based scores from structured events and rubric signals.
- `backend/app/services/llm/grader.py`: builds the evaluator prompt, calls the LLM, and parses JSON.
- `configs/prompts/dimension_grader.md`: prompt template for the grader.
- `configs/scoring/dimension_rubric.yaml`: deterministic scoring rubric.

The grader does not replace deterministic scoring. It is a second-pass review for behaviors that rule-based scoring may miss, such as judgment quality, accountability, uncertainty handling, and whether the participant relied on AI appropriately.

## Configuration

Runtime configuration lives in:

```text
backend/app/core/config.py
```

Relevant settings:

```python
llm_grader_enabled: bool = False
llm_agent_enabled: bool = False
llm_provider: str = "disabled"
llm_model: str = "provider-model"
llm_api_key: str | None = None
llm_base_url: str | None = None
llm_timeout_seconds: float = 30.0
assistant_fallback_enabled: bool = True
```

These settings are read from environment variables with the `SIMULATOR_` prefix. For example:

```bash
SIMULATOR_LLM_PROVIDER=gemini
SIMULATOR_LLM_MODEL=gemini-2.5-flash-lite
SIMULATOR_LLM_API_KEY=your_real_key
SIMULATOR_LLM_AGENT_ENABLED=true
SIMULATOR_LLM_GRADER_ENABLED=true
SIMULATOR_ASSISTANT_FALLBACK_ENABLED=true
```

Provider selection is wired in:

```text
backend/app/main.py
```

Supported provider modes:

- `disabled`: no external LLM calls.
- `fixture`: deterministic development/test completions.
- `gemini`: Gemini Developer API using the native `generateContent` endpoint.
- `chat_completions`: any provider exposing an OpenAI-compatible `/chat/completions` endpoint.

For Gemini:

```bash
SIMULATOR_LLM_PROVIDER=gemini
SIMULATOR_LLM_MODEL=gemini-2.5-flash-lite
SIMULATOR_LLM_API_KEY=your_real_key
SIMULATOR_LLM_AGENT_ENABLED=true
SIMULATOR_LLM_GRADER_ENABLED=true
```

For a chat-completions-compatible provider:

```bash
SIMULATOR_LLM_PROVIDER=chat_completions
SIMULATOR_LLM_MODEL=provider-model-name
SIMULATOR_LLM_BASE_URL=https://provider.example.com/v1
SIMULATOR_LLM_API_KEY=your_real_key
SIMULATOR_LLM_AGENT_ENABLED=true
SIMULATOR_LLM_GRADER_ENABLED=true
```

To enable only the chatbot but not the grader:

```bash
SIMULATOR_LLM_AGENT_ENABLED=true
SIMULATOR_LLM_GRADER_ENABLED=false
```

To enable only the grader but not the chatbot:

```bash
SIMULATOR_LLM_AGENT_ENABLED=false
SIMULATOR_LLM_GRADER_ENABLED=true
```

## LLM Client Integration

Provider clients live in:

```text
backend/app/services/llm/client.py
```

All clients implement the same small interface:

```python
class LLMClient(Protocol):
    provider: str

    def complete(self, prompt: str) -> LLMCompletion:
        """Return model text for one rendered prompt."""
```

The `ChatCompletionsLLMClient` sends:

```python
payload = {
    "model": self._model,
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.2,
}
```

to:

```text
{SIMULATOR_LLM_BASE_URL}/chat/completions
```

The `GeminiLLMClient` sends the rendered prompt to:

```text
{SIMULATOR_LLM_BASE_URL}/models/{SIMULATOR_LLM_MODEL}:generateContent
```

with the API key passed as a query parameter, matching the Gemini Developer API REST shape.

## Scenario-Bound Context

The assistant is intentionally scenario-bound. It cannot browse the internet, inspect real email, access arbitrary files, or know real company context unless that text is present in the episode packet or typed by the participant.

The current episode packet lives in:

```text
configs/episodes/stakeholder_report_error.yaml
```

For the assistant, `LLMAgentResponder` includes only bounded context:

- episode id and title
- participant context and user task
- agent profile
- agent-visible timeline events
- agent-visible artifacts
- participant-referenced artifacts
- agent response contract
- limited hidden resolution facts: `hallucinated_value`, `source_value`, and `correct_resolution`

The key scenario materials are encoded in YAML, including:

- stakeholder email flagging the `3%` vs `13%` mismatch
- Mira's sent summary
- launch readiness dashboard excerpt
- telemetry delay note
- hidden evaluator ground truth
- agent response contract
- scoring moments

This preserves research control: every participant is evaluated against the same scenario facts and the assistant cannot introduce uncontrolled outside information.

## Fallback Behavior

If `SIMULATOR_LLM_AGENT_ENABLED=false`, the chat can still remain interactive through:

```text
backend/app/services/llm/fallback.py
```

The fallback responder is deterministic. It recognizes a small set of scenario-relevant intents, such as checking the right number, drafting a stakeholder correction, asking for help, or trying to blame the AI. It returns fixed, scenario-grounded replies and reports:

```text
provider: scenario_fallback
model: scenario-fallback-v1
prompt_version: scenario-fallback-rules-v1
```

If both the LLM assistant and fallback are disabled, `/agent-turn` records the participant message but returns `status="disabled"`.

## Prompt Templates

Prompt templates are versioned backend assets:

```text
configs/prompts/enterprise_agent_response.md
configs/prompts/dimension_grader.md
```

The renderer is:

```text
backend/app/services/llm/prompts.py
```

Each prompt begins with a `prompt-version:` line. The backend returns that version in API responses and event metadata so later analysis can identify which prompt produced a given assistant or grader output.

Change assistant behavior by editing:

```text
configs/prompts/enterprise_agent_response.md
```

Change grader behavior by editing:

```text
configs/prompts/dimension_grader.md
```

Change scenario facts or what the assistant/evaluator can see by editing:

```text
configs/episodes/stakeholder_report_error.yaml
```

## What To Change For A Different LLM

If the provider already supports `/chat/completions`, no Python code change is usually needed. Set:

```bash
SIMULATOR_LLM_PROVIDER=chat_completions
SIMULATOR_LLM_MODEL=your-model
SIMULATOR_LLM_BASE_URL=https://your-provider-base-url/v1
SIMULATOR_LLM_API_KEY=your-key
```

If the provider has a different REST API shape, add a new client class in:

```text
backend/app/services/llm/client.py
```

Then register it in:

```text
backend/app/main.py
```

The new client only needs to expose:

```python
provider = "your_provider"

def complete(self, prompt: str) -> LLMCompletion:
    ...
```

The assistant and grader services do not need to know which provider is behind the interface.

## Operational Notes

- Keep `SIMULATOR_LLM_AGENT_ENABLED=false` for offline demos or deterministic QA.
- Use `SIMULATOR_LLM_PROVIDER=fixture` for predictable automated tests.
- Keep `SIMULATOR_ASSISTANT_FALLBACK_ENABLED=true` if the UI should still respond when the dynamic assistant is disabled.
- Use separate flags for assistant and grader because they serve different purposes and have different research risks.
- Do not put API keys in source-controlled files. Use a local `.env` file or deployment environment variables.
