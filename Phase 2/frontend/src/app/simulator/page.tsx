import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SimulatorClient } from "@/components/simulator/SimulatorClient";

export default function SimulatorPage() {
  return (
    <AppShell>
      <Suspense fallback={<section className="panel loading-pulse" style={{ minHeight: 320 }} />}>
        <SimulatorClient />
      </Suspense>
    </AppShell>
  );
}
