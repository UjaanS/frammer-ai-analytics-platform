"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { defaultContextB, defaultDashboardState, ensureContextPair } from "@/lib/compare/defaults";
import { readDashboardStateFromUrl, writeDashboardStateToUrl } from "@/lib/compare/url-state";
import { writeLocalStorage } from "@/lib/storage/safe-local-storage";
import type { CompareBy, DashboardContext, DashboardState, DateRange, ReportFilterState } from "@/lib/widgets/types";

type DashboardAction =
  | { type: "hydrate"; state: DashboardState }
  | { type: "toggleCompare"; enabled: boolean }
  | { type: "setCompareBy"; compareBy: CompareBy }
  | { type: "setViewMode"; viewMode: DashboardState["viewMode"] }
  | { type: "setSyncFilters"; syncFilters: boolean }
  | { type: "setSyncHover"; syncHover: boolean }
  | { type: "updateContext"; contextId: string; patch: Omit<Partial<DashboardContext>, "filters"> & { filters?: Partial<ReportFilterState> } }
  | { type: "cloneLeftToRight" }
  | { type: "swapContexts" }
  | { type: "reset" };

const STORAGE_KEY = "frammer-dashboard:comparison-state:v3";

export function useComparisonDashboardState() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, dispatch] = useReducer(reducer, defaultDashboardState);

  useEffect(() => {
    const storedState = readDashboardStateFromUrl();
    if (storedState) {
      dispatch({ type: "hydrate", state: storedState });
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    writeLocalStorage(STORAGE_KEY, JSON.stringify(state));
    writeDashboardStateToUrl(state);
  }, [isHydrated, state]);

  const activeContexts = useMemo(() => ensureContextPair(state).contexts, [state]);

  const setCompareMode = useCallback((enabled: boolean) => {
    dispatch({ type: "toggleCompare", enabled });
  }, []);

  const updateContextFilters = useCallback((contextId: string, filters: Partial<ReportFilterState>) => {
    dispatch({
      type: "updateContext",
      contextId,
      patch: {
        filters
      }
    });
  }, []);

  const updateContextDateRange = useCallback((contextId: string, dateRange: DateRange) => {
    dispatch({
      type: "updateContext",
      contextId,
      patch: {
        dateRange
      }
    });
  }, []);

  return {
    state,
    contexts: activeContexts,
    isHydrated,
    setCompareMode,
    updateContextFilters,
    updateContextDateRange,
    setCompareBy: (compareBy: CompareBy) => dispatch({ type: "setCompareBy", compareBy }),
    setViewMode: (viewMode: DashboardState["viewMode"]) => dispatch({ type: "setViewMode", viewMode }),
    setSyncFilters: (syncFilters: boolean) => dispatch({ type: "setSyncFilters", syncFilters }),
    setSyncHover: (syncHover: boolean) => dispatch({ type: "setSyncHover", syncHover }),
    cloneLeftToRight: () => dispatch({ type: "cloneLeftToRight" }),
    swapContexts: () => dispatch({ type: "swapContexts" }),
    resetComparison: () => dispatch({ type: "reset" })
  };
}

function reducer(state: DashboardState, action: DashboardAction): DashboardState {
  if (action.type === "hydrate") return ensureContextPair(action.state);
  if (action.type === "reset") return defaultDashboardState;

  if (action.type === "toggleCompare") {
    return ensureContextPair({
      ...state,
      compareMode: action.enabled,
      viewMode: action.enabled ? state.viewMode : "split"
    });
  }

  if (action.type === "setCompareBy") return { ...state, compareBy: action.compareBy };
  if (action.type === "setViewMode") return { ...state, viewMode: action.viewMode };
  if (action.type === "setSyncFilters") return { ...state, syncFilters: action.syncFilters };
  if (action.type === "setSyncHover") return { ...state, syncHover: action.syncHover };

  if (action.type === "updateContext") {
    const contexts = ensureContextPair(state).contexts.map((context) => {
      if (context.id !== action.contextId) return context;
      return {
        ...context,
        ...action.patch,
        filters: {
          ...context.filters,
          ...action.patch.filters
        },
        dateRange: action.patch.dateRange ?? context.dateRange
      };
    });

    if (state.syncFilters && action.contextId === contexts[0]?.id && contexts[1]) {
      contexts[1] = {
        ...contexts[1],
        filters: contexts[0].filters,
        dateRange: contexts[0].dateRange
      };
    }

    return {
      ...state,
      contexts: state.compareMode ? contexts : [contexts[0]]
    };
  }

  if (action.type === "cloneLeftToRight") {
    const [left, right = defaultContextB] = ensureContextPair({ ...state, compareMode: true }).contexts;
    return {
      ...state,
      compareMode: true,
      contexts: [
        left,
        {
          ...right,
          filters: left.filters,
          dateRange: left.dateRange,
          dimensions: { ...left.dimensions, clonedFrom: left.id }
        }
      ]
    };
  }

  if (action.type === "swapContexts") {
    const [left, right = defaultContextB] = ensureContextPair({ ...state, compareMode: true }).contexts;
    return {
      ...state,
      compareMode: true,
      contexts: [right, left]
    };
  }

  return state;
}
