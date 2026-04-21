"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AgentPanel } from "@/components/simulator/AgentPanel";
import { DecisionPanel } from "@/components/simulator/DecisionPanel";
import { ReflectionPanel } from "@/components/simulator/ReflectionPanel";
import { ResearchSummaryPanel } from "@/components/simulator/ResearchSummaryPanel";
import { ScenarioPanel } from "@/components/simulator/ScenarioPanel";
import { StatusPanel } from "@/components/simulator/StatusPanel";
import { useSimulatorSession } from "@/hooks/useSimulatorSession";

/** Render the live simulator experience for whichever scenario is selected in the URL. */
export function SimulatorClient() {
  const searchParams = useSearchParams();
  const selectedScenarioId = searchParams.get("scenarioId");
  const {
    currentStep,
    sessionSummary,
    sessionId,
    scenarioId,
    rationale,
    reflection,
    confidence,
    isLoading,
    isSubmittingAction,
    isSubmittingReflection,
    notice,
    error,
    setRationale,
    setReflection,
    setConfidence,
    submitAction,
    submitReflection
  } = useSimulatorSession(selectedScenarioId);

  const reflectionEnabled =
    Boolean(currentStep?.step.reflection_enabled) &&
    Boolean(currentStep?.chosen_action_id) &&
    !(currentStep?.is_completed ?? false);

  return (
    <>
      <section className="hero-card">
        <span className="eyebrow">Live Simulator</span>
        <div className="hero-grid">
          <div>
            <h1 className="hero-title">Human decisions stay visible.</h1>
            <p className="hero-copy">
              This page renders the current step, agent recommendations, and human response
              inputs while the backend controls session progression and logging.
            </p>
          </div>
          <div className="cta-row" style={{ alignSelf: "start", justifyContent: "flex-end" }}>
            <Link className="secondary-button" href="/">
              Back to Start
            </Link>
          </div>
        </div>
      </section>

      <div className="simulator-grid">
        <div className="stack">
          {currentStep ? <ScenarioPanel data={currentStep} /> : <section className="panel loading-pulse" />}
          {currentStep ? (
            <AgentPanel agentOutputs={currentStep.advisor_outputs} />
          ) : (
            <section className="panel loading-pulse" />
          )}
          {currentStep ? (
            <DecisionPanel
              actions={currentStep.step.possible_actions}
              phase={currentStep.step.phase}
              selectedActionId={currentStep.chosen_action_id}
              rationale={rationale}
              onRationaleChange={setRationale}
              onActionSubmit={submitAction}
              isSubmitting={
                isSubmittingAction ||
                isLoading ||
                currentStep.is_completed ||
                Boolean(currentStep.chosen_action_id)
              }
            />
          ) : (
            <section className="panel loading-pulse" />
          )}
        </div>

        <div className="stack">
          <StatusPanel
            sessionId={sessionId}
            scenarioId={scenarioId}
            phase={currentStep?.step.phase ?? null}
            stepId={currentStep?.step.step_id ?? null}
            runMode={currentStep?.study_context.run_mode ?? null}
            isCompleted={currentStep?.is_completed ?? false}
            isBusy={isLoading || isSubmittingAction || isSubmittingReflection}
            notice={notice}
            error={error}
          />
          <ReflectionPanel
            prompt={currentStep?.step.reflection_prompt}
            reflection={reflection}
            confidence={confidence}
            isEnabled={reflectionEnabled}
            onReflectionChange={setReflection}
            onConfidenceChange={setConfidence}
            onSubmit={submitReflection}
            isSubmitting={isSubmittingReflection || isLoading || !reflectionEnabled}
          />
          <ResearchSummaryPanel summary={sessionSummary} />
        </div>
      </div>
    </>
  );
}
