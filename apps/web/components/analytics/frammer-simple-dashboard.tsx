"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import { readPersonaFromSearchParams } from "@/components/analytics/persona-switcher";
import { ComparisonDashboard } from "@/components/compare/comparison-dashboard";
import { type Persona, personaDefinitions, clientDashboardDefinition } from "@/lib/widgets/dashboard-presets";

function PersonaDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const persona = readPersonaFromSearchParams(searchParams);
  const definition = personaDefinitions[persona];

  // setPersona is hoisted to here because the active persona is stored in
  // the URL — ComparisonDashboard and the NLQ apply-loop both need a way
  // to mutate it.
  const setPersona = useCallback(
    (next: Persona) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "client") params.delete("view");
      else params.set("view", next);
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams]
  );

  // `key` ensures useDashboardState remounts cleanly when the persona changes,
  // so each persona's localStorage-backed layout state is loaded fresh.
  return <ComparisonDashboard key={definition.id} definition={definition} setPersona={setPersona} />;
}

export function FrammerSimpleDashboard() {
  // Suspense boundary lets static prerender succeed; the client renders the
  // persona-driven dashboard once searchParams hydrate.
  return (
    <Suspense fallback={<ComparisonDashboard definition={clientDashboardDefinition} setPersona={() => {}} />}>
      <PersonaDashboard />
    </Suspense>
  );
}
