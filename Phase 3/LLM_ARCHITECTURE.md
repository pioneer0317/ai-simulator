# LLM Architecture

This document explains how the current system uses three bounded LLM roles: the participant-facing chatbot, the hidden live semantic classifier, and the hidden post-session grader. The main design choice is that all LLM paths are bounded by the episode packet. The model is not treated as a free agent with open access to company data, email, files, or the internet.

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
Hidden semantic classifier records any matched scenario option/rubric signal
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
Deterministic scorer consumes raw events plus semantic classifications
   ->
Secondary/fallback LLM grader review
   ->
Score response for analysis/admin use
```

## Three Separate LLM Roles

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

### 2. Hidden Semantic Classifier

The semantic classifier runs during the live scenario after participant messages
or final decision events. It is hidden from the participant and returns strict
JSON. Its job is to map participant meaning to scenario options and rubric
signals, not to produce a score or assistant reply.

The implementation is split across:

- `backend/app/services/sessions.py`: appends the raw participant event, calls the classifier, enriches the raw event metadata, and appends a separate `semantic_classification` evaluator event for auditability.
- `backend/app/services/llm/classifier.py`: builds the classifier prompt, validates JSON, applies confidence thresholds, and falls back to deterministic scenario rules when disabled or unusable.
- `configs/prompts/scenario1_semantic_classifier.md`: prompt template for the finalized Scenario 1 classifier.
- `backend/app/scenarios/scenario_1/uncertainty.py`: deterministic fallback classifier and shared Scenario 1 choice metadata.

For finalized Scenario 1, the classifier maps paraphrases into Choice A, B, C,
C-i, C-ii, C-iii, or D. A short answer like "looks good" is classified as
Choice A only because its meaning is approval to send as-is, not because that
exact string is special. A phrase such as "wait, ask Marcus to confirm the
Nexus contractor number" maps to Choice C-i.

The participant-facing agent does not receive hidden evaluator classification
events in its prompt transcript. This prevents scoring/rubric leakage while
still letting progression and scoring use the classifier output.

If a participant message does not fit any finalized Scenario 1 choice, the
backend still appends a `semantic_classification` evaluator event with
`classification_status="unclassified"`. This keeps deviations analyzable instead
of hiding them. Researchers can distinguish participants who followed a clear
scenario path from participants who reached a similar final state only after
unclassified turns, nudges, or forced progression events.

### 3. Evaluator/Grader LLM

The grader is used after the session through:

```text
POST /api/v1/sessions/{session_id}/score
```

The implementation is split across:

- `backend/app/api/routes/episodes.py`: exposes the route.
- `backend/app/services/sessions.py`: runs deterministic scoring, then the secondary/fallback LLM review.
- `backend/app/services/scoring/deterministic.py`: computes rule-based scores from structured events and rubric signals.
- `backend/app/services/llm/grader.py`: builds the evaluator prompt, calls the LLM, and parses JSON.
- `configs/prompts/dimension_grader.md`: prompt template for the grader.
- `configs/scoring/dimension_rubric.yaml`: deterministic scoring rubric.

The grader does not replace deterministic scoring. It is the fallback review layer after rubric scoring, used to cover outliers and behaviors that rule-based scoring may miss, such as judgment quality, accountability, uncertainty handling, and whether the participant relied on AI appropriately.

## Online Semantic Signal Detection

Live participant messages are classified before the assistant reply is generated.
This layer maps meaning to scenario options or rubric signals, even when the
participant does not use exact rubric wording. For finalized Scenario 1, for
example, a short response like "looks good" is recorded as Choice A only when it
means send the Q3 budget summary to Priya as-is. A response that asks what "that
number may shift" means is recorded as Choice C.

This signal detection is used for nudges, progression, and deterministic
scoring. It is not the final grade by itself. The final research score still
runs after the episode from the complete transcript, then the optional LLM
grader reviews the result for semantic nuance and missed behavior.

Current implementation:

- `backend/app/services/llm/classifier.py`: hidden LLM semantic classifier with
  deterministic fallback.
- `configs/prompts/scenario1_semantic_classifier.md`: Scenario 1 classifier
  prompt and JSON schema.
- `backend/app/scenarios/scenario_1/uncertainty.py`: Scenario 1 option and
  subchoice fallback classifier.
- `backend/app/services/sessions.py`: enriches participant event metadata and
  appends auditable `semantic_classification` events.
- `backend/app/services/scoring/deterministic.py`: applies the finalized
  Scenario 1 uncertainty-recognition point model.

## Configuration

Runtime configuration lives in:

```text
backend/app/core/config.py
```

Relevant settings:

```python
llm_grader_enabled: bool = False
llm_classifier_enabled: bool = False
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
SIMULATOR_LLM_CLASSIFIER_ENABLED=true
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
SIMULATOR_LLM_CLASSIFIER_ENABLED=true
SIMULATOR_LLM_GRADER_ENABLED=true
```

For a chat-completions-compatible provider:

```bash
SIMULATOR_LLM_PROVIDER=chat_completions
SIMULATOR_LLM_MODEL=provider-model-name
SIMULATOR_LLM_BASE_URL=https://provider.example.com/v1
SIMULATOR_LLM_API_KEY=your_real_key
SIMULATOR_LLM_AGENT_ENABLED=true
SIMULATOR_LLM_CLASSIFIER_ENABLED=true
SIMULATOR_LLM_GRADER_ENABLED=true
```

To enable only the chatbot but not the grader:

```bash
SIMULATOR_LLM_AGENT_ENABLED=true
SIMULATOR_LLM_CLASSIFIER_ENABLED=true
SIMULATOR_LLM_GRADER_ENABLED=false
```

To enable only the grader but not the chatbot:

```bash
SIMULATOR_LLM_AGENT_ENABLED=false
SIMULATOR_LLM_CLASSIFIER_ENABLED=false
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

The current finalized Scenario 1 packet lives in:

```text
configs/episodes/q3_budget_summary.yaml
```

The stakeholder error packet also remains available for later Phase 3 testing:
`configs/episodes/stakeholder_report_error.yaml`.

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

## Session And Participant Identifiers

The backend separates run identity from participant metadata:

- `session_id`: backend-generated UUID for one simulation run.
- `participant_run_id`: backend-generated pseudonymous run identifier, intended for research exports and analysis joins.
- `participant_id`: optional study/subject id supplied by the caller in `participant_profile`.
- `event_id`: backend-generated UUID for one logged event.
- `created_at`: backend timestamp for each event.
- `started_at` and `completed_at`: backend timestamps for the session lifecycle.

This means the simulator does not require a real name, email, or authenticated user account to collect analyzable data. If an external study system has a stable subject id, it can pass that value as `participant_profile.participant_id`; otherwise, analysis can still use `participant_run_id` without depending on personally identifying information.

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
configs/prompts/scenario1_semantic_classifier.md
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

Change Scenario 1 semantic classification behavior by editing:

```text
configs/prompts/scenario1_semantic_classifier.md
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
- Use separate flags for assistant, classifier, and grader because they serve different purposes and have different research risks.
- Do not put API keys in source-controlled files. Use a local `.env` file or deployment environment variables.
