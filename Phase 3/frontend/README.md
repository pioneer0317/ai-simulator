# Human-Agent Team Simulator Frontend

This is the active Phase 3 frontend. It combines the earlier research flow with the latest MacBook desktop interaction prototype:

1. Pre-questionnaire
2. Interactive desktop simulation
3. Post-simulation reflection
4. Analytics/results
5. Separate admin dashboard at `/admin`

The active route components are:

- `src/app/pages/PreQuestionnairePage.tsx`
- `src/app/pages/DesktopSimulationPage.tsx`
- `src/app/pages/PostSimulationReflectionPage.tsx`
- `src/app/pages/AnalyticsPageEnhanced.tsx`
- `src/app/pages/AdminDashboardPage.tsx`

The standalone `Macbook Desktop Interface` folder remains a reference export from Figma Make. The implementation used by the product flow lives in `src/desktop` and is wired into `src/app/pages/DesktopSimulationPage.tsx`.

The desktop UI is intentionally kept close to the Figma Make export. The main integration adjustments are:

- wrapper component renamed from standalone `App` to `MacbookDesktop`
- props added for scenario completion, backend assistant turns, and event tracking
- assistant chat can call the backend LLM/fallback endpoint before using the local demo reply
- window/file/mail interactions emit structured simulator events
- desktop completion moves the participant into the post-simulation reflection route

## Run

```bash
npm install
npm run dev
```

The frontend expects the backend at `http://127.0.0.1:8000` unless overridden in `src/app/lib/simulatorApi.ts`.
