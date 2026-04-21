import { CurrentStepResponse } from "@/lib/types";

type ScenarioPanelProps = {
  data: CurrentStepResponse;
};

export function ScenarioPanel({ data }: ScenarioPanelProps) {
  const participantRole =
    (data.session_metadata.participant_role as string | undefined) ?? data.study_context.participant_role;

  return (
    <section className="panel">
      <span className="eyebrow">Scenario Context</span>
      <h2 className="panel-title">{data.scenario_title}</h2>
      <p className="panel-subtitle">{data.step.title}</p>
      <div className="scenario-meta">
        <div className="meta-block">
          <p className="meta-label">Human Role</p>
          <p className="meta-value">{participantRole ?? data.human_role}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Phase</p>
          <p className="meta-value">{data.step.phase}</p>
        </div>
        <div className="meta-block">
          <p className="meta-label">Step ID</p>
          <p className="meta-value">{data.step.step_id}</p>
        </div>
      </div>
      <p>{data.step.context}</p>
    </section>
  );
}
