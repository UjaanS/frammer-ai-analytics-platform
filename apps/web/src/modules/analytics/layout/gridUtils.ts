import type { WidgetSchema } from "@/lib/widgets/types";
import { getWidgetGridSpan } from "./layoutConfig";

<<<<<<< HEAD
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
    const firstOrder = finiteNumber(first.position.y, 0) * 100 + finiteNumber(first.position.x, 0);
    const secondOrder = finiteNumber(second.position.y, 0) * 100 + finiteNumber(second.position.x, 0);
    return firstOrder - secondOrder;
  });

  if (mode === "dashboard") {
    return sortedWidgets.map((widget) => sanitizeDashboardLayout(widget));
  }

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

function sanitizeDashboardLayout(widget: WidgetSchema): Layout {
  const span = getWidgetGridSpan(widget, "dashboard");
  const width = clamp(finiteNumber(widget.position.w, span.w), span.minW, 12);
  const height = Math.max(finiteNumber(widget.position.h, span.h), span.minH);

  return {
    ...widget.position,
    i: widget.id,
    x: clamp(finiteNumber(widget.position.x, 0), 0, Math.max(0, 12 - width)),
    y: Math.max(0, finiteNumber(widget.position.y, 0)),
    w: width,
    h: height,
    minW: span.minW,
    minH: span.minH,
    maxW: 12
  };
}

=======
// Insert a newly-added or restored widget at the top of the grid, pushing
// every other visible widget down by the inserted widget's height so they
// don't overlap. The grid then vertically compacts via react-grid-layout's
// compactType="vertical" on the next render.
>>>>>>> origin/claude/elated-galileo-73ca50
export function insertWidgetAtTop(widgets: WidgetSchema[], widgetId: string): WidgetSchema[] {
  const target = widgets.find((widget) => widget.id === widgetId);
  if (!target) return widgets;

  const span = getWidgetGridSpan(target);
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

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
