type StatusPanelProps = {
  sessionId: string | null;
  scenarioId: string | null;
  phase: string | null;
  stepId: string | null;
  runMode: string | null;
  isCompleted: boolean;
  isBusy: boolean;
  notice: string | null;
  error: string | null;
};

export function StatusPanel({
  sessionId,
  scenarioId,
  phase,
  stepId,
  runMode,
  isCompleted,
  isBusy,
  notice,
  error
}: StatusPanelProps) {
  return (
    <div className="stack">
      <section className={`status-card${isBusy ? " loading-pulse" : ""}`}>
        <span className="status-label">Session</span>
        <p className="status-value">{sessionId ?? "Creating session..."}</p>
      </section>
      <section className="status-card">
        <span className="status-label">Scenario</span>
        <p className="status-value">{scenarioId ?? "Pending"}</p>
      </section>
      <section className="status-card">
        <span className="status-label">State</span>
        <p className="status-value">{isCompleted ? "Completed" : "In progress"}</p>
      </section>
      <section className="status-card">
        <span className="status-label">Phase</span>
        <p className="status-value">{phase ?? "Pending"}</p>
      </section>
      <section className="status-card">
        <span className="status-label">Step</span>
        <p className="status-value">{stepId ?? "Pending"}</p>
      </section>
      <section className="status-card">
        <span className="status-label">Run Mode</span>
        <p className="status-value">{runMode ?? "test"}</p>
      </section>
      {notice ? (
        <section className="status-card">
          <span className="status-label">Notice</span>
          <p className="status-value">{notice}</p>
        </section>
      ) : null}
      {error ? (
        <section className="status-card">
          <span className="status-label">Error</span>
          <p className="status-value">{error}</p>
        </section>
      ) : null}
    </div>
  );
}
