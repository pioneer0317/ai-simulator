import { AdvisorOutput } from "@/lib/types";

type AgentPanelProps = {
  agentOutputs: AdvisorOutput[];
};

export function AgentPanel({ agentOutputs }: AgentPanelProps) {
  return (
    <section className="panel">
      <span className="eyebrow">Advisor Outputs</span>
      <h2 className="panel-title">Structured recommendations</h2>
      <p className="panel-subtitle">
        These advisor perspectives are authored in the scenario config and persisted once per
        step so researchers can review exactly what the participant saw.
      </p>
      {agentOutputs.length === 0 ? (
        <article className="agent-card">
          <p className="muted">
            This step is about context or decision framing, so no advisor recommendations are
            shown here.
          </p>
        </article>
      ) : null}
      <div className="agent-list">
        {agentOutputs.map((agent) => (
          <article className="agent-card" key={`${agent.advisor_id}-${agent.display_name}`}>
            <div className="agent-header">
              <div>
                <h3 className="agent-name">{agent.display_name}</h3>
                <p className="muted" style={{ marginTop: 4 }}>
                  {agent.role}
                </p>
              </div>
              <span className="confidence-pill">
                {Math.round(agent.confidence * 100)}% confidence
              </span>
            </div>
            <p className="agent-recommendation">{agent.recommendation}</p>
            <p className="muted">{agent.rationale}</p>
            {agent.source_materials.length > 0 ? (
              <p className="field-help">Grounding: {agent.source_materials.join(" • ")}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
