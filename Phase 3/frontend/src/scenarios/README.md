Frontend scenario workspace
===========================

Use this folder when the team is splitting prototype work by scenario.

- `scenario-1`: Q3 budget summary / Priya workflow
- `scenario-2`: SEA expansion recommendation workflow
- `scenario-3`: Feature launch go/no-go workflow

Shared desktop shell code stays in `src/desktop`. Scenario-specific data,
copy, helpers, and components should live in the matching scenario folder so
parallel branches do not touch the same files unnecessarily.
