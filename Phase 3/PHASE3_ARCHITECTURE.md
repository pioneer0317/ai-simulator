# Phase 3 Architecture Notes

## Current Phase 2 Flow

```text
Scenario YAML
  -> role-specific step
  -> advisor output templates
  -> possible actions
  -> branching
  -> reflection
  -> deterministic scoring
```

This is useful, but it can make the participant feel like they are choosing from a decision form. It also puts most measurement on the participant's response to AI output.

## Advisor-Requested Phase 3 Flow

```text
Episode packet
  -> participant-safe context
  -> prior agent activity
  -> visible artifacts
  -> hidden evaluator ground truth
  -> participant messages/actions/artifact opens
  -> optional bounded LLM agent response
  -> deterministic scoring
  -> secondary/fallback LLM grading review
```

This lets the simulator test whether the participant:

- gives the agent clear instructions
- checks source documents
- recognizes uncertainty
- owns the outcome
- calibrates trust
- uses help without being led by canned suggested responses

## LLM Integration Path

Level 1 and Level 2 work at the same time as the existing scenario definitions. They do not require replacing the scenario model with LLM autonomy.

```text
Episode packet remains source of truth
        |
        +-- deterministic scoring uses structured events and rubric signals
        |
        +-- secondary/fallback LLM grader reviews transcript and hidden ground truth
        |
        +-- LLM agent can generate bounded replies from the same packet
```

The safest MVP sequence is:

1. Build rich packets and artifact/event logging.
2. Add deterministic scoring.
3. Add secondary/fallback LLM grading.
4. Add LLM-generated agent replies inside the episode contract.
5. Later, add true multi-agent orchestration for episodes that need it.

## Does Embedded Agent Mean True Multi-Agent Backend?

Not yet. In Phase 3, "embedded" means the user experience makes the agent feel connected to workplace systems: email, dashboards, documents, prior work, and decision consequences.

The backend can still use one session service and one episode packet. True multi-agent architecture becomes necessary only when a scenario specifically needs multiple agents with conflicting recommendations or separate capabilities.

## Dev / Prod Separation

The backend uses one code path with environment-specific configuration:

```text
SIMULATOR_APP_ENV=dev
  -> drafts, review_ready, approved episodes available

SIMULATOR_APP_ENV=prod
  -> approved episodes only
```

Sessions and events include the environment in returned state/metadata so later database persistence can keep research exports clean even if dev/prod are already separated at the RDS level.
