import { getApiBaseUrl } from "@/lib/api";
import { SessionSummaryResponse } from "@/lib/types";

type ResearchSummaryPanelProps = {
  summary: SessionSummaryResponse | null;
};

export function ResearchSummaryPanel({ summary }: ResearchSummaryPanelProps) {
  if (!summary) {
    return null;
  }

  const apiBaseUrl = getApiBaseUrl();
  const stepsExportUrl = `${apiBaseUrl}/simulator/sessions/${summary.session_id}/export?view=steps`;
  const eventsExportUrl = `${apiBaseUrl}/simulator/sessions/${summary.session_id}/export?view=events`;
  const jsonSummaryUrl = `${apiBaseUrl}/simulator/sessions/${summary.session_id}/summary`;
  const participantRole =
    (summary.session_metadata.participant_role as string | undefined) ??
    summary.study_context.participant_role ??
    "Not selected";
  const researchDimensions = getStringList(summary.scenario_metadata.research_dimensions);
  const completedAt = formatTimestamp(summary.completed_at);
  const startedAt = formatTimestamp(summary.started_at);
  const scenarioCategory = getCategoryLabel(summary.scenario_metadata.category);

  return (
    <section className="panel">
      <span className="eyebrow">Research Summary</span>
      <h2 className="panel-title">Session outputs are ready</h2>
      <p className="panel-subtitle">
        This panel is designed for the handoff flow: it shows the stored research metadata and
        provides direct export links for downstream analysis.
      </p>
      <div className="scenario-meta">
        <div className="meta-block">
          <p className="meta-label">Scenario</p>
          <p className="meta-value">{summary.scenario_title}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Role</p>
          <p className="meta-value">{participantRole}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Category</p>
          <p className="meta-value">{scenarioCategory}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Run Mode</p>
          <p className="meta-value">{summary.study_context.run_mode}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Step Records</p>
          <p className="meta-value">{summary.step_responses.length}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Event Records</p>
          <p className="meta-value">{summary.event_logs.length}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Started</p>
          <p className="meta-value">{startedAt}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Completed</p>
          <p className="meta-value">{completedAt}</p>
        </div>
      </div>
      <p className="muted" style={{ marginTop: -2 }}>
        {summary.scenario_description}
      </p>
      {researchDimensions.length > 0 ? (
        <div className="badge-row" style={{ marginTop: 14 }}>
          {researchDimensions.map((dimension) => (
            <span className="badge" key={dimension}>
              {dimension}
            </span>
          ))}
        </div>
      ) : null}
      <div className="cta-row">
        <a className="primary-button" href={stepsExportUrl} download>
          Download Step CSV
        </a>
        <a className="secondary-button" href={eventsExportUrl} download>
          Download Event CSV
        </a>
        <a className="secondary-button" href={jsonSummaryUrl} target="_blank" rel="noreferrer">
          Open JSON Summary
        </a>
      </div>
      <div className="stack" style={{ marginTop: 20 }}>
        {summary.step_responses.map((step) => (
          <article className="agent-card" key={step.step_id}>
            <div className="agent-header">
              <h3 className="agent-name">
                {step.phase}: {step.step_id}
              </h3>
              <span className="confidence-pill">
                {step.chosen_action_id ?? "no action recorded"}
              </span>
            </div>
            {step.rationale ? <p className="muted">Rationale: {step.rationale}</p> : null}
            {step.reflection_text ? (
              <p className="muted">Reflection: {step.reflection_text}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function getStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function getCategoryLabel(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Research";
  }
  return value
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "Not completed";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
