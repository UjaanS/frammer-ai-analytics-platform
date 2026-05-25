import type { Layout } from "react-grid-layout";

import type { WidgetSchema } from "@/lib/widgets/types";
import type { AnalyticsLayoutMode, DashboardGridConfig, DashboardGridItem } from "./layoutConfig";
import { getWidgetGridSpan } from "./layoutConfig";

export function createGridConfig(dashboardId: string, widgets: WidgetSchema[]): DashboardGridConfig {
  return {
    dashboardId,
    items: widgets.map(toGridItem)
  };
}

export function toGridItem(widget: WidgetSchema): DashboardGridItem {
  return {
    id: widget.id,
    columnSpan: widget.position.w,
    rowSpan: widget.position.h,
    order: widget.position.y * 100 + widget.position.x
  };
}

export function sortGridItems(items: DashboardGridItem[]) {
  return [...items].sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
}

export function mergeGridConfig(defaultConfig: DashboardGridConfig, storedConfig?: DashboardGridConfig | null): DashboardGridConfig {
  if (!storedConfig || storedConfig.dashboardId !== defaultConfig.dashboardId) {
    return defaultConfig;
  }

  const storedById = new Map(storedConfig.items.map((item) => [item.id, item]));

  return {
    dashboardId: defaultConfig.dashboardId,
    items: defaultConfig.items.map((item) => ({
      ...item,
      ...storedById.get(item.id)
    }))
  };
}

export function normalizeWidgetLayouts(widgets: WidgetSchema[], mode: AnalyticsLayoutMode = "dashboard"): Layout[] {
  const sortedWidgets = [...widgets].sort((first, second) => {
    const firstOrder = first.position.y * 100 + first.position.x;
    const secondOrder = second.position.y * 100 + second.position.x;
    return firstOrder - secondOrder;
  });

  let cursorX = 0;
  let cursorY = 0;
  let currentRowHeight = 0;

  return sortedWidgets.map((widget) => {
    const span = getWidgetGridSpan(widget, mode);

    if (cursorX > 0 && cursorX + span.w > 12) {
      cursorX = 0;
      cursorY += currentRowHeight;
      currentRowHeight = 0;
    }

    const layout: Layout = {
      ...widget.position,
      i: widget.id,
      x: cursorX,
      y: cursorY,
      w: span.w,
      h: span.h,
      minW: span.minW,
      minH: span.minH
    };

    cursorX += span.w;
    currentRowHeight = Math.max(currentRowHeight, span.h);

    if (cursorX >= 12) {
      cursorX = 0;
      cursorY += currentRowHeight;
      currentRowHeight = 0;
    }

    return layout;
  });
}

export function insertWidgetAtTop(widgets: WidgetSchema[], widgetId: string): WidgetSchema[] {
  const target = widgets.find((widget) => widget.id === widgetId);
  if (!target) return widgets;

  const span = getWidgetGridSpan(target, "dashboard");
  const targetPosition = {
    ...target.position,
    i: target.id,
    x: 0,
    y: 0,
    w: span.w,
    h: span.h,
    minW: span.minW,
    minH: span.minH
  };

  return widgets.map((widget) => {
    if (widget.id === widgetId) {
      return { ...widget, visible: true, position: targetPosition };
    }

    if (widget.visible === false) return widget;

    return {
      ...widget,
      position: {
        ...widget.position,
        y: widget.position.y + span.h
      }
    };
  });
}
