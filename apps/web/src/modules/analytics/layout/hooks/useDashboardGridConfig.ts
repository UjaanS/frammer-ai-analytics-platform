"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { WidgetSchema } from "@/lib/widgets/types";

import { createGridConfig, mergeGridConfig } from "../gridUtils";
import { ENABLE_NEW_GRID_SYSTEM, type DashboardGridConfig } from "../layoutConfig";
import { clearGridLayout, readGridLayout, writeGridLayout } from "../layoutStore";

export function useDashboardGridConfig(dashboardId: string, widgets: WidgetSchema[]) {
  const defaultConfig = useMemo(() => createGridConfig(dashboardId, widgets), [dashboardId, widgets]);
  const [config, setConfig] = useState<DashboardGridConfig>(defaultConfig);

  useEffect(() => {
    if (!ENABLE_NEW_GRID_SYSTEM) {
      setConfig(defaultConfig);
      return;
    }

    setConfig(mergeGridConfig(defaultConfig, readGridLayout(dashboardId)));
  }, [dashboardId, defaultConfig]);

  const saveConfig = useCallback((nextConfig: DashboardGridConfig) => {
    setConfig(nextConfig);
    if (ENABLE_NEW_GRID_SYSTEM) writeGridLayout(nextConfig);
  }, []);

  const resetConfig = useCallback(() => {
    clearGridLayout(dashboardId);
    setConfig(defaultConfig);
  }, [dashboardId, defaultConfig]);

  return {
    config,
    defaultConfig,
    enabled: ENABLE_NEW_GRID_SYSTEM,
    saveConfig,
    resetConfig
  };
}
