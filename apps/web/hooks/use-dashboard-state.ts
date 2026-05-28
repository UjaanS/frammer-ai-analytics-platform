"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Layout } from "react-grid-layout";

import type { DashboardDefinition, LayoutMode, WidgetConfig, WidgetSchema } from "@/lib/widgets/types";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "@/lib/storage/safe-local-storage";
import { insertWidgetAtTop } from "@/src/modules/analytics/layout";

type StoredDashboard = {
  widgets: WidgetSchema[];
};

// Pick the right widget set for the active layout mode. Comparison mode
// falls back to the dashboard widgets when no comparison-specific layout
// is provided in the definition.
function selectDefaultWidgets(definition: DashboardDefinition, mode: LayoutMode): WidgetSchema[] {
  if (mode === "comparison" && definition.comparisonWidgets) {
    return definition.comparisonWidgets;
  }
  return definition.widgets;
}

export function useDashboardState(definition: DashboardDefinition, layoutMode: LayoutMode = "dashboard") {
  // Storage key includes the layout mode so dragging in dashboard mode never
  // touches the comparison-mode layout and vice versa.
  const storageKey = `frammer-dashboard:${definition.id}:${layoutMode}`;
  const defaultWidgets = useMemo(() => selectDefaultWidgets(definition, layoutMode), [definition, layoutMode]);

  // Track the storageKey alongside widgets so we can detect mode/persona
  // changes and reset to the new default synchronously (before localStorage
  // hydration in useEffect re-runs).
  const [widgets, setWidgets] = useState<WidgetSchema[]>(defaultWidgets);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  if (hydratedKey !== null && hydratedKey !== storageKey) {
    // Mode or persona changed — drop to default immediately; useEffect below
    // will hydrate from the new key on the next tick.
    setWidgets(defaultWidgets);
    setHydratedKey(null);
  }

  useEffect(() => {
    const raw = readLocalStorage(storageKey);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredDashboard;
        setWidgets(reconcileWidgets(defaultWidgets, stored.widgets));
      } catch {
        setWidgets(defaultWidgets);
      }
    } else {
      setWidgets(defaultWidgets);
    }
    setHydratedKey(storageKey);
  }, [defaultWidgets, storageKey]);

  const isHydrated = hydratedKey === storageKey;

  useEffect(() => {
    if (!isHydrated) return;
    writeLocalStorage(storageKey, JSON.stringify({ widgets }));
  }, [isHydrated, storageKey, widgets]);

  const layout = useMemo(() => widgets.filter((widget) => widget.visible !== false).map((widget) => widget.position), [widgets]);

  const updateLayout = useCallback((nextLayout: Layout[]) => {
    setWidgets((current) => {
      let changed = false;
      const nextWidgets = current.map((widget) => {
        const updatedPosition = nextLayout.find((layoutItem) => layoutItem.i === widget.id);
        if (!updatedPosition) return widget;

        if (hasSameLayout(widget.position, updatedPosition)) {
          return widget;
        }

        changed = true;
        return { ...widget, position: { ...widget.position, ...updatedPosition } };
      });

      return changed ? nextWidgets : current;
    });
  }, []);

  const updateWidgetConfig = useCallback((widgetId: string, config: Partial<WidgetConfig>) => {
    setWidgets((current) =>
      current.map((widget) =>
        widget.id === widgetId ? { ...widget, config: { ...widget.config, ...config } } : widget
      )
    );
  }, []);

  const addWidget = useCallback((widget: WidgetSchema) => {
    setWidgets((current) => {
      const existing = current.find((item) => item.id === widget.id);
      if (existing) {
        const restored = current.map((item) => (item.id === widget.id ? { ...item, visible: true } : item));
        return insertWidgetAtTop(restored, widget.id);
      }
      const next = [...current, { ...widget, visible: true }];
      return insertWidgetAtTop(next, widget.id);
    });
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setWidgets((current) =>
      current.map((widget) => (widget.id === widgetId ? { ...widget, visible: false } : widget))
    );
  }, []);

  const resetDashboard = useCallback(() => {
    removeLocalStorage(storageKey);
    setWidgets(defaultWidgets);
  }, [defaultWidgets, storageKey]);

  return {
    widgets,
    layout,
    updateLayout,
    updateWidgetConfig,
    addWidget,
    removeWidget,
    resetDashboard
  };
}

function reconcileWidgets(defaultWidgets: WidgetSchema[], storedWidgets: WidgetSchema[]) {
  if (!Array.isArray(storedWidgets)) return defaultWidgets;

  const storedById = new Map(sanitizeStoredWidgets(storedWidgets).map((widget) => [widget.id, widget]));
  const restoredDefaults = defaultWidgets.map((widget) => storedById.get(widget.id) ?? widget);
  const customWidgets = sanitizeStoredWidgets(storedWidgets).filter((widget) => !defaultWidgets.some((defaultWidget) => defaultWidget.id === widget.id));
  return [...restoredDefaults, ...customWidgets];
}

function sanitizeStoredWidgets(widgets: WidgetSchema[]) {
  const seen = new Set<string>();
  const validTypes = new Set(["kpi", "line-chart", "bar-chart", "pie-chart", "table", "heatmap", "ai-insight"]);
  const validQueryKeys = new Set(["summary", "timeTrend", "channelPerformance", "platformDistribution", "videoList", "qualityHeatmap", "aiInsight"]);

  return widgets.flatMap((widget) => {
    if (
      !widget ||
      typeof widget.id !== "string" ||
      seen.has(widget.id) ||
      !validTypes.has(widget.type) ||
      !validQueryKeys.has(widget.queryKey)
    ) {
      return [];
    }

    seen.add(widget.id);

    const position = widget.position ?? { i: widget.id, x: 0, y: 0, w: 6, h: 5 };
    return [{
      ...widget,
      position: {
        ...position,
        i: widget.id,
        x: finiteNumber(position.x, 0),
        y: finiteNumber(position.y, 0),
        w: finiteNumber(position.w, widget.type === "kpi" ? 3 : 6),
        h: finiteNumber(position.h, widget.type === "kpi" ? 2 : 5),
        minW: finiteNumber(position.minW, widget.type === "kpi" ? 2 : 3),
        minH: finiteNumber(position.minH, widget.type === "kpi" ? 2 : 4)
      },
      config: widget.config ?? {}
    }];
  });
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function hasSameLayout(current: Layout, next: Layout) {
  return (
    current.x === next.x &&
    current.y === next.y &&
    current.w === next.w &&
    current.h === next.h
  );
}
