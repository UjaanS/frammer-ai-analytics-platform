"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { readPersonaFromSearchParams } from "@/components/analytics/persona-switcher";
import { ComparisonDashboard } from "@/components/compare/comparison-dashboard";
import { personaDefinitions, clientDashboardDefinition } from "@/lib/widgets/dashboard-presets";

function PersonaDashboard() {
  const searchParams = useSearchParams();
  const persona = readPersonaFromSearchParams(searchParams);
  const definition = personaDefinitions[persona];

  // `key` ensures useDashboardState remounts cleanly when the persona changes,
  // so each persona's localStorage-backed layout state is loaded fresh.
  return <ComparisonDashboard key={definition.id} definition={definition} />;
}

export function FrammerSimpleDashboard() {
  // Suspense boundary lets static prerender succeed; the client renders the
  // persona-driven dashboard once searchParams hydrate.
  return (
    <Suspense fallback={<ComparisonDashboard definition={clientDashboardDefinition} />}>
      <PersonaDashboard />
    </Suspense>
  );
}
