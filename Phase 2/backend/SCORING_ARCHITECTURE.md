# Phase 2 Scoring And Orchestration Notes

This backend is designed as a multi-agent-capable architecture, not a
multi-agent-only architecture.

## Agent Activation

Scenario YAML controls which agents are active for each step:

- If a step has one `advisor_outputs` entry, only that one advisor is activated.
- If a step has multiple `advisor_outputs`, the backend runs those advisors as a panel.
- The synthesis advisor is appended only when there is more than one specialist output and orchestration is enabled.
- This means single-agent scenarios and multi-agent scenarios use the same workflow without a separate code path.

The relevant orchestration code lives in:

- `app/services/agents/workflow.py`
- `configs/scenarios/*.yaml`
- `configs/advisors/*.yaml`

## Placeholder Scoring

The current scoring layer is deterministic and rubric-led. It does not use an
LLM as the scoring authority.

The five placeholder dimensions are:

- `accountability`
- `conflict_navigation`
- `uncertainty_recognition`
- `anchoring_persuasion_resistance`
- `multi_agent_synthesis`

The editable rubric lives in:

- `configs/scoring/dimension_rubric.yaml`

The scoring engine reads prototype chat snapshots and classifies:

- user messages
- structured frontend user actions
- timeline events
- aggregate behavioral flags

Anything captured from the participant that does not match the active rubric is
returned as `unclassified_behaviors` so the research team can refine the rubric
without forcing ambiguous behavior into the wrong category.

## API Surface

Prototype session state now includes:

- `dimension_scores`
- `unclassified_behaviors`
- `scoring_metadata`

The scoring metadata explicitly marks the LLM classifier as disabled. A future
LLM-assisted layer should be treated as supporting evidence unless the research
team approves a different validation plan.
