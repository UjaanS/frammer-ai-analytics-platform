import type { DashboardContext, DashboardState, ReportFilterState } from "@/lib/widgets/types";

export const defaultReportFilters: ReportFilterState = {
  comparison: "previous-period",
  company: "AAA - Frammer AI",
  channel: "Channel-Frammer AI",
  user: "all",
  videoType: "all",
  dimension: "none",
  dimensionFilter: "none",
  published: "all"
};

export const defaultContextA: DashboardContext = {
  id: "context-a",
  label: "Context A",
  dateRange: {
    start: "2026-05-01",
    end: "2026-05-31"
  },
  filters: defaultReportFilters,
  dimensions: {}
};

export const defaultContextB: DashboardContext = {
  id: "context-b",
  label: "Context B",
  dateRange: {
    start: "2026-05-01",
    end: "2026-05-15"
  },
  filters: {
    ...defaultReportFilters,
    comparison: "previous-period"
  },
  dimensions: {
    clonedFrom: "context-a"
  }
};

export const defaultDashboardState: DashboardState = {
  compareMode: false,
  compareBy: "time",
  // Default to "overlay" so toggling Compare lands on a single chart with
  // both contexts layered on shared axes. Users can still switch to "split"
  // for side-by-side via the toolbar.
  viewMode: "overlay",
  syncFilters: false,
  syncHover: true,
  contexts: [defaultContextA]
};

export function ensureContextPair(state: DashboardState): DashboardState {
  const normalizedState = {
    ...state,
    syncHover: state.syncHover ?? defaultDashboardState.syncHover
  };

  if (!normalizedState.compareMode) {
    return {
      ...normalizedState,
      contexts: [normalizedState.contexts[0] ?? defaultContextA]
    };
  }

  return {
    ...normalizedState,
    contexts: [normalizedState.contexts[0] ?? defaultContextA, normalizedState.contexts[1] ?? defaultContextB]
  };
}
