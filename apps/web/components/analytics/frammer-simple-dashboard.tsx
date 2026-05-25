"use client";

import { ComparisonDashboard } from "@/components/compare/comparison-dashboard";
import { frammerDashboardDefinition } from "@/lib/widgets/dashboard-presets";

export function FrammerSimpleDashboard() {
  return <ComparisonDashboard definition={frammerDashboardDefinition} />;
}
