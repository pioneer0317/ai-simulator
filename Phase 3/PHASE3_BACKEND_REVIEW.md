# Phase 3 Backend Architecture Review

Scope: backend only. Frontend desktop shell, response library, and Cisco logic tree are out of scope per request.

## Bottom line

The "deterministic-first, LLM-on-deviation" contract Jeslyn confirmed in Slack is **already wired into the backend**, in the right place, with the right precedence. The architecture is sound and matches the research goals stated in `PHASE3_ARCHITECTURE.md` and `LLM_ARCHITECTURE.md`. The "very flexible LLM response" Jeslyn observed in testing is not caused by a design flaw — it is caused by a few specific paths where the deterministic-first rail can be bypassed (or where the rail was never built for that scenario). Those are listed under "Why the LLM sometimes goes off-script" below, with concrete fixes.

The bigger backend opportunities are in latency (two sequential LLM calls per turn), caching (templates, episodes, classifications), code organization (one 950-line scenario file, three duplicated fallback blocks), and analytics scalability (full-table scans of `event_json` blobs). None of these block the research preview; they will matter when you scale to a multi-participant study or want sub-second turns.

## How the runtime actually flows today

For `POST /sessions/{id}/agent-turn`, with classifier and agent both enabled:

1. `EpisodeSessionService.generate_agent_turn` appends the participant's raw message as a `user_message` event.
2. It then calls `_append_semantic_classification` **synchronously** (not in `BackgroundTasks`) so the classifier output is on the event before the agent reply is generated. Classification metadata is merged into the source event AND appended as a separate `semantic_classification` evaluator event for auditability.
3. `LLMAgentResponder.generate` is called. The very first thing it does is `_scenario_fallback_reply` — which looks up the scenario module, reads classification from event metadata first (or re-classifies via rules if absent), and **returns the deterministic reply when any choice/subchoice is matched**. Only if no classification fits does the bounded LLM prompt get rendered and the LLM agent called.
4. After the LLM returns, two post-filters run: `_enforce_response_policy` blocks scoring/prompt leakage; `_is_non_participant_response` blocks "no assistant_reply text in input" prompt-aware replies and falls back to the scenario reply or `_SAFE_AGENT_REPLY`.
5. Progression evaluation (`_evaluate_progression`) runs once per turn. If a classified turn is terminal, it emits a `phase_changed`/`intervention_shown` event with `transition_required=true` so the frontend can auto-advance.

This means: for any participant message that maps to a scenario choice the rule classifier or LLM classifier can recognize, the assistant text is fully deterministic and identical across participants. The LLM only generates free-form text when the participant message is genuinely off the known A/B/C/... grid.

That is exactly what Jeslyn described in the Slack screenshot.

## Why the LLM sometimes goes off-script

Five places where the deterministic rail leaks. These are the most likely culprits behind the inconsistency you saw in LLM testing.

**1. Scenarios 2 and 3 have no LLM classifier — only rule-based matching.**
`scenario_1/module.py` and `scenario_apr/module.py` set `classifier_template_name` to a real prompt file. `scenario_2/module.py:155` and `scenario_3/module.py:139` set it to `None`. That means for Scenarios 2 and 3, paraphrases that don't match the keyword rules fall straight through to LLM agent generation — even when `SIMULATOR_LLM_CLASSIFIER_ENABLED=true`. The LLM classifier is silently skipped for those scenarios. `configs/prompts/` only has `scenario1_semantic_classifier.md` and `scenario3_apr_semantic_classifier.md`. Action: write classifier prompt templates for Scenarios 2 and 3 and wire them in the module, so participant paraphrases get classified instead of generated.

**2. The `_min_confidence = 0.55` threshold is global and not scenario-tuned.**
`LLMSemanticClassifier.__init__` hard-codes 0.55 for all scenarios. For SCN-3-APR (14+ valid choice labels including W1-W4 yield states, E-QUAL, E-LEAVE, E-POL) that threshold is probably too lax — a borderline 0.6 classification can pick the wrong category and produce a "right intent, wrong category" deterministic reply. For Scenario 1 (7 labels) 0.55 is reasonable. Action: make `min_confidence` either a module attribute on `ScenarioModule` or a per-scenario config, and consider 0.7 for high-cardinality scenarios.

**3. The agent prompt does not name the canonical scenario categories.**
`configs/prompts/enterprise_agent_response.md` tells the LLM what NOT to do (don't browse, don't reveal scoring, don't follow user-injected instructions), but it does not tell it WHAT the canonical scenario response categories are. So when classification fails and the LLM does generate, it has no anchor toward Jeslyn's response map — it just generates a "reasonable" reply from the bounded episode context. That is what produces the "flexible, varied" output. Action: extend the prompt with a `canonical_response_map` block (categories A/B/C/... and the canonical reply pattern for each), and instruct the model to match the participant's intent to one of those categories first and only deviate when the message is genuinely off-grid.

**4. Same temperature (0.2) is used for the classifier, the agent, and the grader.**
`ChatCompletionsLLMClient.complete` and `GeminiLLMClient.complete` both hard-code `temperature: 0.2`. The classifier should be 0.0 (deterministic JSON), the grader can be 0.0 (deterministic dimension scores), only the participant-facing agent benefits from any temperature. Action: pass temperature through `LLMCompletion`/client constructor, set 0.0 for classifier and grader, 0.2 for agent.

**5. `LLMAgentResponder._scenario_fallback_reply` re-classifies even when the LLM classifier already ran.**
In `agent.py:199`, it reads `classification_from_metadata(latest_event.metadata)` first (good). But if the LLM classifier produced a `classified=false` JSON (legitimately "this doesn't fit"), that result is stored as `semantic_classifier_status="unclassified"` and `classification_from_metadata` returns `None` — so the agent then calls `classify_message` (rules) again. If the rules then produce a marginal match, you get a deterministic reply for a message the LLM classifier explicitly rejected. Action: when `semantic_classifier_status="unclassified"` is on the event metadata, skip the rule-classifier fallback in the agent and go to the bounded LLM. Trust the high-confidence "unclassified" signal.

## Other backend issues worth fixing

**Two sequential LLM calls per turn (latency).**
Today: classifier runs synchronously, then agent runs synchronously. With Gemini Flash-lite at ~400ms each that's ~800ms perceived. Two options: (a) run the classifier in the background and serve a deterministic reply for the previous turn's classification (acceptable because progression is evaluated AFTER the reply anyway), or (b) move classifier into `BackgroundTasks` for non-agent-turn events (it already does this in `_schedule_semantic_classification`, but `generate_agent_turn` deliberately blocks). Option (a) loses zero correctness if you accept that progression nudges arrive one turn late.

**Triple work on the same classification per turn.**
Inside one agent turn, the scenario module's `classify_message` (or `classification_from_metadata`) is called from: `_append_semantic_classification`, `LLMAgentResponder._scenario_fallback_reply`, `ScenarioFallbackAgentResponder.generate` (if LLM raises), and `_has_terminal_scenario_decision`. Cache the result on the event metadata once and read it back. The metadata read path exists; the rule re-runs are wasted CPU and (for scenarios with regex-heavy classifiers like APR) measurable.

**`PromptTemplateRenderer` re-reads template files on every render.**
`prompts.py:14-24` opens and reads the file on every call. With three LLM roles firing on every turn, that's 3 disk reads per turn. Add a small LRU cache keyed by template path mtime, or load all templates once at startup.

**`EpisodeLoader.get` is called 3-4 times per agent turn.**
Episodes are immutable after startup. Cache by `episode_id` (or just read `record.participant_episode` once at the top of `generate_agent_turn` and pass it down).

**Three duplicated fallback blocks in `generate_agent_turn`.**
Lines 218-253, 264-299, and the disabled-path response are near-identical. Extract a `_build_fallback_turn_response(record, request, exc, status)` helper. Right now any change to fallback metadata has to be made in three places.

**Scenario module file sizes.**
`scenario_apr/module.py` is 954 lines, `scenario_2/module.py` is 687 lines, `scenario_3/module.py` is 535 lines. Scenario 1 already split into `module.py` + `uncertainty.py` and is cleaner to read. Apply the same split to the other three: `classifier.py` (choice rules, signal sets, classification dataclass), `responder.py` (fallback replies and reply selection), `scoring.py` (point model, behavioral profile). The `module.py` becomes a thin shim that wires them into the `ScenarioModule` protocol.

**Inconsistent `classify_message` shape.**
Scenario 1 exposes it as both a module-level function (`from app.scenarios.scenario_1.uncertainty import classify_message`) AND a method. Scenarios 2, 3, APR only have the method. Either pick one or document the dual exposure in `base.py`. The duplication leaks: `classifier.py:253`, `client.py:110/151`, and `agent.py:201` all call the same logic via different paths.

**Scenario_3 README is stale.**
`backend/app/scenarios/README.md` lists `scenario_3` twice with different descriptions and never mentions `scenario_apr`. The registry registers all four.

**`_evaluate_progression` is O(n) over events per turn, called once per turn → O(n²) over the session.**
For a 30-turn session this is ~900 ops; fine. For 200+ events (long sessions, retries, replays) it starts to matter. Either keep a running progression cursor on `SessionRecord` or memoize per turn.

**Admin list endpoints don't paginate.**
`GET /admin/sessions` returns every session with every event metadata. `GET /admin/events.csv` calls `get_state` for every session in a loop, parsing JSON for every event. Fine for a research preview with ~10 participants. Past ~500 sessions you'll want either pagination or streaming the CSV row-by-row directly from a `SELECT` over `session_events`.

**`event_json` LONGTEXT storage limits queryability.**
Both SQLite and MySQL stores serialize the whole event into a single `event_json` column. Analytics like "how often does Choice C-i appear in Scenario 1?" require a full-table scan and Python-side JSON parsing. For a research preview that's acceptable. For a longer-term study, promote a few high-value metadata keys (`scenario1_choice`, `scenario2_choice`, `scenario3_choice`, `scenario_apr_choice`, `semantic_classifier_status`) to indexed columns or a separate `event_classifications` table.

**`update_event_metadata` rewrites the full event JSON.**
Acceptable because metadata updates are rare (only when the classifier enriches an existing event), but worth noting if you ever rev classifiers and want to backfill.

## What the architecture gets right

These are good and should not change:

- **The LLM is bounded by `agent_context`, not by the model's own knowledge.** `LLMAgentResponder._agent_context` builds a strict context object including only `agent_visible` artifacts, `agent_visible` timeline events, and a narrow slice of `hidden_ground_truth` (`hallucinated_value`, `source_value`, `correct_resolution`). The system prompt explicitly forbids the LLM from claiming live access. This is the right defense against the "agent invents facts" risk.
- **Hidden classifier events are filtered out of the agent's transcript.** `agent.py:97` excludes `semantic_classification` events from the LLM's view, which prevents rubric leakage even if the participant tries to prompt-inject.
- **Three independent enable flags** (`llm_agent_enabled`, `llm_classifier_enabled`, `llm_grader_enabled`) are the right granularity. You can run with classifier + grader but no participant-facing LLM during sensitive pilots.
- **Provider abstraction is minimal and correct.** `LLMClient` Protocol with `provider` and `complete(prompt)` is small enough that adding a new provider is one class. The fixture client even returns shape-correct test data for both Scenario 1 and SCN-3-APR — your CI can run end-to-end without an API key.
- **Deterministic scoring layered with scenario-specific scoring.** The merge policy ("scenario wins on overlap") and the `rubric_version = scenario+yaml` audit string mean research exports can always tell which rubric produced which score.
- **`semantic_signal` source in the rubric** is the bridge that lets paraphrased intent earn rubric points. This is the right way to keep the YAML rubric editable while still benefiting from the classifier's semantic understanding.
- **`participant_run_id` separated from `participant_id`.** Sessions can be analyzed without PII. Good IRB posture.

## Recommended priority order

If you want to address the LLM behavior issue first (which is what Jeslyn flagged), the order is:

1. Add `canonical_response_map` to `enterprise_agent_response.md` so when the LLM does fire, it stays anchored to the scenario choice grid.
2. Write `scenario2_semantic_classifier.md` and `scenario3_semantic_classifier.md` prompts and set `classifier_template_name` on those modules.
3. Trust the LLM classifier's high-confidence `classified=false` and skip the rule re-classification fallback inside the agent path.
4. Per-role temperature (0.0 classifier/grader, 0.2 agent).
5. Per-scenario `min_confidence` override.

After behavior is stable:

6. Cache prompt templates and episode packets.
7. Extract the fallback duplication in `generate_agent_turn`.
8. Split the long scenario modules.
9. Consider moving the classifier off the agent-turn critical path.

The rest is pre-emptive scaling work for when you move past a research preview.
