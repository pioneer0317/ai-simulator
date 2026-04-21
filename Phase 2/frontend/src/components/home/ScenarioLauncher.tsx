"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listScenarios } from "@/lib/api";
import { ScenarioCatalogEntry } from "@/lib/types";

/** Render the backend-owned scenario catalog so researchers can launch real scenarios. */
export function ScenarioLauncher() {
  const [scenarios, setScenarios] = useState<ScenarioCatalogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadScenarios() {
      try {
        setIsLoading(true);
        setError(null);
        const nextScenarios = await listScenarios();
        if (isActive) {
          setScenarios(nextScenarios);
        }
      } catch (unknownError) {
        if (isActive) {
          setError(
            unknownError instanceof Error
              ? unknownError.message
              : "Unable to load the scenario catalog."
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadScenarios();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <span className="eyebrow">Scenario Catalog</span>
      <h2 className="panel-title">Choose a research scenario</h2>
      <p className="panel-subtitle">
        These scenarios come from the current research direction and are loaded from the backend
        config rather than hard-coded into the UI.
      </p>
      {error ? <p className="status-value">{error}</p> : null}
      <div className="scenario-grid">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <article className="scenario-card loading-pulse" key={index} />
            ))
          : scenarios.map((scenario) => {
              const dimensions = Array.isArray(scenario.metadata.research_dimensions)
                ? (scenario.metadata.research_dimensions as string[])
                : [];
              const participantRoles = getParticipantRoles(scenario);
              return (
                <article className="scenario-card" key={scenario.scenario_id}>
                  <div className="inline-row" style={{ alignItems: "flex-start" }}>
                    <div>
                      <h3 className="panel-title" style={{ marginBottom: 6 }}>
                        {scenario.title}
                      </h3>
                      <p className="muted">{scenario.description}</p>
                    </div>
                    <span className="confidence-pill">{scenario.step_count} steps</span>
                  </div>
                  <div className="scenario-meta" style={{ marginTop: 16 }}>
                    <div className="meta-block">
                      <p className="meta-label">Supported Roles</p>
                      <p className="meta-value">{participantRoles.join(", ")}</p>
                    </div>
                    <div className="meta-block">
                      <p className="meta-label">Category</p>
                      <p className="meta-value">
                        {formatCategoryLabel(
                          (scenario.metadata.category as string | undefined) ?? "research"
                        )}
                      </p>
                    </div>
                  </div>
                  {dimensions.length > 0 ? (
                    <div className="badge-row" style={{ marginTop: 0 }}>
                      {dimensions.map((dimension) => (
                        <span className="badge" key={dimension}>
                          {dimension}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="cta-row">
                    <Link
                      className="primary-button"
                      href={`/simulator?scenarioId=${encodeURIComponent(scenario.scenario_id)}`}
                    >
                      Launch Scenario
                    </Link>
                  </div>
                </article>
              );
            })}
        {!isLoading && !error && scenarios.length === 0 ? (
          <article className="scenario-card empty-state">
            <h3 className="panel-title">No scenarios loaded</h3>
            <p className="muted">
              The backend is reachable, but it did not return any scenario configs to launch.
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function getParticipantRoles(scenario: ScenarioCatalogEntry): string[] {
  const roles = scenario.metadata.participant_roles;
  if (!Array.isArray(roles) || roles.length === 0) {
    return [scenario.human_role];
  }
  const validatedRoles = roles.filter((role): role is string => typeof role === "string");
  return validatedRoles.length > 0 ? validatedRoles : [scenario.human_role];
}

function formatCategoryLabel(category: string): string {
  return category
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}
