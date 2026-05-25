import type { WidgetSchema } from "@/lib/widgets/types";

export const ENABLE_NEW_GRID_SYSTEM =
  process.env.NEXT_PUBLIC_ENABLE_NEW_GRID_SYSTEM !== "false" &&
  process.env.ENABLE_NEW_GRID_SYSTEM !== "false";

export const DASHBOARD_GRID_STORAGE_PREFIX = "frammer.analytics.layout";

export const dashboardGridBreakpoints = {
  desktop: 1280,
  tablet: 768,
  mobile: 0
} as const;

export const dashboardGridColumns = {
  desktop: 12,
  tablet: 6,
  mobile: 1
} as const;

export type DashboardGridBreakpoint = keyof typeof dashboardGridBreakpoints;
export type AnalyticsLayoutMode = "dashboard" | "comparison";

export type DashboardGridItem = {
  id: WidgetSchema["id"];
  columnSpan?: number;
  rowSpan?: number;
  order?: number;
};

export type DashboardGridConfig = {
  dashboardId: string;
  items: DashboardGridItem[];
};

export const dashboardGridDensity = {
  legacy: {
    rowHeight: 80,
    margin: [18, 18] as [number, number]
  },
  compact: {
    rowHeight: 72,
    margin: [14, 14] as [number, number]
  }
} as const;

export function getWidgetGridSpan(widget: WidgetSchema, mode: AnalyticsLayoutMode = "dashboard") {
  if (mode === "comparison") {
    if (widget.type === "kpi") return { w: 6, h: 2, minW: 3, minH: 2 };
    if (widget.type === "table" && widget.queryKey === "videoList") return { w: 12, h: 7, minW: 6, minH: 5 };
    if (widget.type === "table") return { w: 12, h: 5, minW: 6, minH: 4 };
    return { w: 12, h: 6, minW: 6, minH: 5 };
  }

  if (widget.type === "kpi") return { w: 3, h: 2, minW: 2, minH: 2 };
  if (widget.type === "table" && widget.queryKey === "videoList") return { w: 12, h: 7, minW: 6, minH: 5 };
  if (widget.type === "table") return { w: 12, h: 5, minW: 6, minH: 4 };
  if (widget.type === "ai-insight") return { w: 6, h: 4, minW: 3, minH: 3 };
  return { w: 6, h: 6, minW: 3, minH: 5 };
}
