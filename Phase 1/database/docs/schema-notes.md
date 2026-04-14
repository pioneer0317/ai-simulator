# Phase 1 Schema Notes

The phase 1 simulator uses three tables only:

- `sessions`
- `step_responses`
- `event_logs`

## Modeling stance

- `sessions` is one row per simulator run.
- `step_responses` keeps the user-visible data for each step in one place:
  advisor outputs, chosen action, rationale, reflection, and timestamps.
- `event_logs` stays append-only so the team can later expand analytics without
  changing the simulator flow first.

## Why this is intentionally small

Phase 1 is meant to prove the simulator loop:

1. load scenario
2. show advisor outputs
3. capture decision
4. capture reflection
5. store analyzable data

If the data engineer later wants to normalize advisor outputs, split reflections,
or add prompt/version tables, that can happen in a later migration once the
first end-to-end loop is stable.
