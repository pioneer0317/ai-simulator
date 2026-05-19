Frontend scenario workspace
===========================

Use this folder when the team is splitting prototype work by scenario.

- `scenario-1`: SCN-1-UR / Priya budget uncertainty workflow
- `scenario-2`: SCN-2-ACC / Ahmed Patel case-note accountability workflow
- `scenario-3`: SCN-3-APR / Jordan Mills performance-review workflow
- `scenario-4`: SCN-4-MAS / ProductScope, LegalGuard, FinanceTrack launch workflow

Shared desktop shell code stays in `src/desktop`. Scenario-specific data,
copy, helpers, and components should live in the matching scenario folder so
parallel branches do not touch the same files unnecessarily.
