type ReflectionPanelProps = {
  prompt: string | null | undefined;
  reflection: string;
  confidence: number;
  isEnabled: boolean;
  onReflectionChange: (value: string) => void;
  onConfidenceChange: (value: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function ReflectionPanel({
  prompt,
  reflection,
  confidence,
  isEnabled,
  onReflectionChange,
  onConfidenceChange,
  onSubmit,
  isSubmitting
}: ReflectionPanelProps) {
  return (
    <section className="panel">
      <span className="eyebrow">Reflection</span>
      <h2 className="panel-title">Capture confidence and interpretation</h2>
      <p className="panel-subtitle">
        Reflection is a separate backend event so the research team can analyze it independently
        from the action choice.
      </p>
      <label className="field-label" htmlFor="reflection">
        Prompt
      </label>
      <p className="field-help">
        {isEnabled
          ? prompt ?? "What do you want the research team to understand?"
          : "Make a decision on the current step before reflection becomes available."}
      </p>
      <textarea
        id="reflection"
        className="text-area"
        value={reflection}
        onChange={(event) => onReflectionChange(event.target.value)}
        placeholder="Describe how the agent inputs affected your thinking."
        disabled={!isEnabled}
      />
      <div style={{ marginTop: 18 }}>
        <div className="inline-row">
          <label className="field-label" htmlFor="confidence">
            Confidence
          </label>
          <span className="confidence-pill">{Math.round(confidence * 100)}%</span>
        </div>
        <input
          id="confidence"
          className="range-input"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(confidence * 100)}
          onChange={(event) => onConfidenceChange(Number(event.target.value) / 100)}
          disabled={!isEnabled}
        />
      </div>
      <div className="cta-row">
        <button
          className="secondary-button"
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !isEnabled || reflection.trim().length === 0}
        >
          Save Reflection
        </button>
      </div>
    </section>
  );
}
