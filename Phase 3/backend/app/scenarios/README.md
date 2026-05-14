Backend scenario workspace
==========================

Use this folder for scenario-specific backend helpers, validators, fixtures, or
service code. Episode packets that the loader reads still live in
`Phase 3/configs/episodes`.

- `scenario_1`: Q3 budget summary / Priya workflow
- `scenario_2`: Accountability / Ahmed Patel case-note workflow
- `scenario_3`: Conditional launch decision workflow
- `scenario_2`: SEA expansion recommendation workflow
- `scenario_3`: Feature launch go/no-go workflow

Keep shared session, scoring, and loader code outside these folders unless a
change truly affects every scenario.
