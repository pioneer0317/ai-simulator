import { FormEvent } from "react";
import { PossibleAction } from "@/lib/types";

type DecisionPanelProps = {
  actions: PossibleAction[];
  phase: string;
  selectedActionId?: string | null;
  rationale: string;
  onRationaleChange: (value: string) => void;
  onActionSubmit: (actionId: string) => void;
  isSubmitting: boolean;
};

export function DecisionPanel({
  actions,
  phase,
  selectedActionId,
  rationale,
  onRationaleChange,
  onActionSubmit,
  isSubmitting
}: DecisionPanelProps) {
  const showRationale = phase === "decide";

  const preventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <section className="panel">
      <span className="eyebrow">Decision</span>
      <h2 className="panel-title">
        {phase === "role" ? "Choose the participant role" : "Choose the next move"}
      </h2>
      <p className="panel-subtitle">
        The backend validates the action against the current scenario step, persists it, and
        decides whether reflection is required before advancing.
      </p>
      <form onSubmit={preventSubmit}>
        {showRationale ? (
          <>
            <label className="field-label" htmlFor="rationale">
              Human rationale
            </label>
            <textarea
              id="rationale"
              className="text-area"
              value={rationale}
              onChange={(event) => onRationaleChange(event.target.value)}
              placeholder="Explain what tradeoff or signal most influenced your decision."
            />
            <p className="field-help">
              This text is stored with the decision so the research team can interpret the
              participant&apos;s reasoning.
            </p>
          </>
        ) : (
          <p className="field-help" style={{ marginBottom: 18 }}>
            This step captures the participant&apos;s navigation through the scenario before the
            main decision point.
          </p>
        )}
        <div className="actions-list">
          {actions.map((action) => (
            <button
              className="action-button"
              key={action.action_id}
              type="button"
              onClick={() => onActionSubmit(action.action_id)}
              disabled={isSubmitting}
            >
              <strong>{action.label}</strong>
              {action.description ? <span className="muted">{action.description}</span> : null}
            </button>
          ))}
        </div>
        {selectedActionId ? (
          <p className="field-help" style={{ marginTop: 18 }}>
            Decision recorded: <strong>{selectedActionId}</strong>. Complete the reflection panel
            to finish this step.
          </p>
        ) : null}
      </form>
    </section>
  );
}
