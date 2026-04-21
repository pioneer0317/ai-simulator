import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ScenarioLauncher } from "@/components/home/ScenarioLauncher";
import { getApiDocsUrl } from "@/lib/api";

export default function HomePage() {
  const apiDocsUrl = getApiDocsUrl();

  return (
    <AppShell>
      <section className="hero-card">
        <span className="eyebrow">Human-Agent Team Simulator</span>
        <div className="hero-grid">
          <div>
            <h1 className="hero-title">Study human judgment under multi-agent pressure.</h1>
            <p className="hero-copy">
              This frontend now launches real research scenarios from the backend config, renders
              role and decision flow, and exposes session summaries that can be exported for
              analysis.
            </p>
            <div className="badge-row">
              <span className="badge">Scenario-driven</span>
              <span className="badge">Backend-controlled state</span>
              <span className="badge">Research-ready event capture</span>
            </div>
            <div className="cta-row">
              <Link className="primary-button" href="/simulator?scenarioId=cisco_product_launch_v1">
                Launch Default Scenario
              </Link>
              <a
                className="secondary-button"
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
              >
                View API Docs
              </a>
            </div>
          </div>
          <div className="stack">
            <article className="status-card">
              <span className="status-label">Mode</span>
              <p className="status-value">Local-first skeleton for scenario experiments</p>
            </article>
            <article className="status-card">
              <span className="status-label">Backend responsibilities</span>
              <p className="status-value">
                Session lifecycle, scenario progression, agent outputs, and event logging
              </p>
            </article>
            <article className="status-card">
              <span className="status-label">Frontend responsibilities</span>
              <p className="status-value">
                Present the simulation clearly and capture analyzable human input
              </p>
            </article>
          </div>
        </div>
      </section>
      <ScenarioLauncher />
    </AppShell>
  );
}
