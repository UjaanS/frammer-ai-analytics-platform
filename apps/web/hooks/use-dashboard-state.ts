"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Layout } from "react-grid-layout";

import type { DashboardDefinition, WidgetConfig, WidgetSchema } from "@/lib/widgets/types";

type StoredDashboard = {
  widgets: WidgetSchema[];
};

export function useDashboardState(definition: DashboardDefinition) {
  const storageKey = `frammer-dashboard:${definition.id}`;
  const [widgets, setWidgets] = useState<WidgetSchema[]>(definition.widgets);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredDashboard;
        setWidgets(reconcileWidgets(definition.widgets, stored.widgets));
      } catch {
        setWidgets(definition.widgets);
      }
    }
    setIsHydrated(true);
  }, [definition.widgets, storageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ widgets }));
  }, [isHydrated, storageKey, widgets]);

  const layout = useMemo(() => widgets.filter((widget) => widget.visible !== false).map((widget) => widget.position), [widgets]);

  const updateLayout = useCallback((nextLayout: Layout[]) => {
    setWidgets((current) =>
      current.map((widget) => {
        const updatedPosition = nextLayout.find((layoutItem) => layoutItem.i === widget.id);
        return updatedPosition ? { ...widget, position: { ...widget.position, ...updatedPosition } } : widget;
      })
    );
  }, []);

  const updateWidgetConfig = useCallback((widgetId: string, config: Partial<WidgetConfig>) => {
    setWidgets((current) =>
      current.map((widget) =>
        widget.id === widgetId ? { ...widget, config: { ...widget.config, ...config } } : widget
      )
    );
  }, []);

  const addWidget = useCallback((widget: WidgetSchema) => {
    setWidgets((current) => [...current, widget]);
  }, []);

  const resetDashboard = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setWidgets(definition.widgets);
  }, [definition.widgets, storageKey]);

  return {
    widgets,
    layout,
    updateLayout,
    updateWidgetConfig,
    addWidget,
    resetDashboard
  };
}

function reconcileWidgets(defaultWidgets: WidgetSchema[], storedWidgets: WidgetSchema[]) {
  const storedById = new Map(storedWidgets.map((widget) => [widget.id, widget]));
  const restoredDefaults = defaultWidgets.map((widget) => storedById.get(widget.id) ?? widget);
  const customWidgets = storedWidgets.filter((widget) => !defaultWidgets.some((defaultWidget) => defaultWidget.id === widget.id));
  return [...restoredDefaults, ...customWidgets];
}
