# Config Field Definitions

This document defines the fields used in the phase 1 YAML config files under:

- [configs/scenarios](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/configs/scenarios)
- [configs/advisors](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/configs/advisors)

These YAML files are configuration, not runtime logs and not database tables.

## Scenario File

Example:

- [cisco_product_launch.yaml](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/configs/scenarios/cisco_product_launch.yaml)

### Top-level fields

#### `scenario_id`

- Type: `string`
- Purpose: unique machine-readable identifier for the scenario
- Used for: backend lookup, session creation, and analytics grouping
- Example: `cisco_product_launch_v1`

#### `title`

- Type: `string`
- Purpose: human-readable scenario name
- Used for: UI display and summaries

#### `description`

- Type: `string`
- Purpose: short explanation of what the scenario is modeling
- Used for: documentation and future scenario lists

#### `human_role`

- Type: `string`
- Purpose: the role the participant is playing in the simulation
- Used for: UI framing and research context
- Example: `Incident Response Lead`

#### `metadata`

- Type: `object`
- Purpose: optional extra scenario information
- Used for: tagging, source references, scenario versioning, or future experiments
- Example uses:
  - source basis
  - domain
  - internal notes

#### `steps`

- Type: `array`
- Purpose: ordered list of scenario steps
- Used for: the simulator state machine

## Scenario Step Fields

Each item inside `steps` defines one state in the simulator flow.

#### `step_id`

- Type: `string`
- Purpose: unique identifier for the step within a scenario
- Used for: state tracking, branching, event logs, and storage

#### `phase`

- Type: `string`
- Purpose: identifies where the step sits in the prototype flow
- Used for: rendering `role`, `brief`, or `decide` screens in the frontend
- Example values:
  - `role`
  - `brief`
  - `decide`

#### `title`

- Type: `string`
- Purpose: short label for the step
- Used for: UI headings and summaries

#### `context`

- Type: `string`
- Purpose: the main situation description shown to the participant
- Used for: what the human reads before making a decision

#### `advisor_outputs`

- Type: `array`
- Purpose: the advisor cards shown at that step
- Used for: presenting simulated AI viewpoints

Each advisor output contains:

##### `advisor_id`

- Type: `string`
- Purpose: references an advisor definition file
- Used for: merging scenario-specific output with advisor identity metadata
- Example: `bishop`

##### `recommendation`

- Type: `string`
- Purpose: the main advice shown to the participant
- Used for: the headline action or stance from that advisor

##### `rationale`

- Type: `string`
- Purpose: explanation for the advisor's recommendation
- Used for: helping the participant understand why the advisor suggests that action

##### `confidence`

- Type: `number`
- Purpose: displayed confidence signal for that advisor's output
- Used for: trust/reliance experiments and UI display
- Note: in phase 1 this is manually configured, not computed

#### `possible_actions`

- Type: `array`
- Purpose: the choices the participant can make at that step
- Used for: validating decisions and advancing the scenario

Each possible action contains:

##### `action_id`

- Type: `string`
- Purpose: unique machine-readable identifier for that action
- Used for: storage and branching logic

##### `label`

- Type: `string`
- Purpose: short action text shown in the UI
- Used for: clickable decision options

##### `description`

- Type: `string`
- Purpose: longer explanation of the action
- Used for: helping the participant understand the tradeoff

##### `metadata`

- Type: `object`
- Purpose: extra UI or research details attached to that action
- Used for: role-card attributes, decision tags, or future display hints

#### `branching`

- Type: `object`
- Purpose: maps action IDs to the next step ID
- Used for: state transitions in the simulator

Example:

```yaml
branching:
  controlled_escalation: step_exec_brief
  continue_monitoring: step_exec_brief
```

If `branching` is empty or an action has no next step, the session can complete after reflection.

#### `reflection_prompt`

- Type: `string`
- Purpose: the question asked after the participant submits an action
- Used for: collecting qualitative reasoning and trust data

#### `reflection_enabled`

- Type: `boolean`
- Purpose: controls whether the step waits for a reflection submission
- Used for: letting `role` and `brief` steps auto-advance while `decide` steps require reflection

#### `step_metadata`

- Type: `object`
- Purpose: extra per-step UI data
- Used for: timer defaults, conflict-gap display, role banner text, and other prototype-aligned fields

## Advisor File

Examples:

- [situation_analyst.yaml](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/configs/advisors/situation_analyst.yaml)
- [drifter.yaml](/Users/hanalim/Documents/Github/AI Simulator/Phase 1/configs/advisors/drifter.yaml)

### Advisor fields

#### `advisor_id`

- Type: `string`
- Purpose: unique machine-readable advisor identifier
- Used for: linking scenario outputs to advisor definitions

#### `display_name`

- Type: `string`
- Purpose: name shown in the UI
- Used for: advisor card title

#### `role`

- Type: `string`
- Purpose: short summary of the advisor's function
- Used for: explanation in UI and summaries

#### `source_summary`

- Type: `string`
- Purpose: brief note explaining how this advisor is grounded in the research materials
- Used for: documentation and team understanding

#### `source_materials`

- Type: `array`
- Purpose: source file references used to justify the advisor
- Used for: provenance and research traceability

#### `system_prompt`

- Type: `string`
- Purpose: stored instruction text for future LLM-driven generation
- Used for: not active in phase 1 runtime, but useful for future automation

## Important Distinction

These YAML fields are loaded into Python objects for runtime use.

They are not automatically turned into database tables.

The backend uses them like this:

1. load YAML into validated Python models
2. use those models to drive simulator logic
3. store runtime outputs and user behavior in database tables

So:

- YAML = design-time configuration
- database = runtime data storage
