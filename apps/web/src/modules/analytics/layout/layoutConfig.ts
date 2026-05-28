import type { WidgetSchema } from "@/lib/widgets/types";

// Tuned for compact "enterprise dashboard" density similar to Grafana / Datadog.
export const dashboardGridDensity = {
  compact: {
    rowHeight: 72,
    margin: [14, 14] as [number, number]
  }
} as const;

// Default cell span for a freshly-inserted widget (e.g. via Add Widget modal).
// Existing widgets keep their persisted positions; this is only used when a
// widget has no position yet.
export function getWidgetGridSpan(widget: WidgetSchema) {
  if (widget.type === "kpi") return { w: 3, h: 2, minW: 2, minH: 2 };
  if (widget.type === "table" && widget.queryKey === "videoList") return { w: 12, h: 7, minW: 6, minH: 5 };
  if (widget.type === "table") return { w: 12, h: 5, minW: 6, minH: 4 };
  if (widget.type === "ai-insight") return { w: 6, h: 4, minW: 3, minH: 3 };
  return { w: 6, h: 6, minW: 3, minH: 5 };
}
