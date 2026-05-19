import type { ScenarioTransitionContent } from '../scenarioTransitionContent';

interface ScenarioTransitionOverlayProps {
  content: ScenarioTransitionContent;
  nextScenarioTitle?: string | null;
  onGoToNextScenario?: () => void;
  isAdvancing?: boolean;
}

export function ScenarioTransitionOverlay({
  content,
  nextScenarioTitle,
  onGoToNextScenario,
  isAdvancing = false,
}: ScenarioTransitionOverlayProps) {
  const canAdvance = Boolean(nextScenarioTitle && onGoToNextScenario);

  return (
    <div className="pointer-events-none fixed inset-0 z-[650] flex items-start justify-center px-6 pt-24">
      <div
        className="pointer-events-auto w-full max-w-lg rounded-2xl border-4 border-green-500 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="scenario-transition-title"
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-md"
            aria-hidden
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="scenario-transition-title" className="text-2xl font-bold text-gray-900">
              {content.headline}
            </h2>
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              {content.detailLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {content.badgeLabel}
          </div>

          {canAdvance && (
            <button
              type="button"
              onClick={onGoToNextScenario}
              disabled={isAdvancing}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAdvancing ? 'Loading next scenario…' : `Go to next scenario${nextScenarioTitle ? `: ${nextScenarioTitle}` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
