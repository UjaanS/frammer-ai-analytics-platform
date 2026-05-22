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
  viewMode: "split",
  syncFilters: false,
  contexts: [defaultContextA]
};

export function ensureContextPair(state: DashboardState): DashboardState {
  if (!state.compareMode) {
    return {
      ...state,
      contexts: [state.contexts[0] ?? defaultContextA]
    };
  }

  return {
    ...state,
    contexts: [state.contexts[0] ?? defaultContextA, state.contexts[1] ?? defaultContextB]
  };
}
