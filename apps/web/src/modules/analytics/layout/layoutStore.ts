import { create } from "zustand";

import type { Layout } from "react-grid-layout";

import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "@/lib/storage/safe-local-storage";

import { DASHBOARD_GRID_STORAGE_PREFIX, type DashboardGridConfig } from "./layoutConfig";
import type { AnalyticsLayoutMode } from "./layoutConfig";

type AnalyticsLayoutState = {
  modes: Record<string, AnalyticsLayoutMode>;
  layouts: Record<string, Layout[]>;
  setLayoutMode: (dashboardId: string, mode: AnalyticsLayoutMode) => void;
  setLayout: (dashboardId: string, layout: Layout[]) => void;
  resetLayout: (dashboardId: string) => void;
};

export const useAnalyticsLayoutStore = create<AnalyticsLayoutState>((set) => ({
  modes: {},
  layouts: {},
  setLayoutMode: (dashboardId, mode) =>
    set((state) => ({
      modes: {
        ...state.modes,
        [dashboardId]: mode
      }
    })),
  setLayout: (dashboardId, layout) =>
    set((state) => ({
      layouts: {
        ...state.layouts,
        [dashboardId]: layout
      }
    })),
  resetLayout: (dashboardId) =>
    set((state) => {
      const { [dashboardId]: _layout, ...layouts } = state.layouts;
      const { [dashboardId]: _mode, ...modes } = state.modes;
      return { layouts, modes };
    })
}));

function storageKey(dashboardId: string) {
  return `${DASHBOARD_GRID_STORAGE_PREFIX}:${dashboardId}`;
}

export function readGridLayout(dashboardId: string): DashboardGridConfig | null {
  try {
    const raw = readLocalStorage(storageKey(dashboardId));
    return raw ? (JSON.parse(raw) as DashboardGridConfig) : null;
  } catch {
    return null;
  }
}

export function writeGridLayout(config: DashboardGridConfig) {
  writeLocalStorage(storageKey(config.dashboardId), JSON.stringify(config));
}

export function clearGridLayout(dashboardId: string) {
  removeLocalStorage(storageKey(dashboardId));
}
