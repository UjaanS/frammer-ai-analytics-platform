import type { DashboardDefinition, WidgetSchema } from "@/lib/widgets/types";

export const defaultFrammerWidgets: WidgetSchema[] = [
  widget("kpi-uploaded", "kpi", "Uploaded Videos", "summary", 0, 0, 2, 3, { metric: "uploaded" }),
  widget("kpi-processed", "kpi", "Processed Videos", "summary", 2, 0, 2, 3, { metric: "processed" }),
  widget("kpi-published", "kpi", "Published Videos", "summary", 4, 0, 2, 3, { metric: "published" }),
  widget("kpi-downloads", "kpi", "Downloads", "summary", 6, 0, 2, 3, { metric: "downloads" }),
  widget("kpi-publish-rate", "kpi", "Publish Rate", "summary", 8, 0, 2, 3, { metric: "publishRate" }),
  widget("kpi-processing", "kpi", "Avg Processing", "summary", 10, 0, 2, 3, { metric: "avgProcessing" }),
  widget("trend-chart", "line-chart", "Time Trend", "timeTrend", 0, 3, 8, 7, {
    metricMode: "count",
    timeGroup: "day",
    description: "Uploaded, processed, and published activity over time."
  }),
  widget("trend-table", "table", "Time Trend Table", "timeTrend", 8, 3, 4, 7, {
    metricMode: "count",
    timeGroup: "day",
    columns: ["time", "uploaded", "processed", "published"]
  }),
  widget("channel-chart", "bar-chart", "Channel Performance", "channelPerformance", 0, 10, 8, 7, {
    metricMode: "count",
    dimension: "channel",
    description: "Channel wise data with a count and duration toggle."
  }),
  widget("channel-table", "table", "Channel Wise Data Table", "channelPerformance", 8, 10, 4, 7, {
    metricMode: "count",
    columns: ["channel", "uploaded", "processed", "published"]
  }),
  widget("platform-chart", "bar-chart", "Platform Distribution", "platformDistribution", 0, 17, 8, 7, {
    metricMode: "count",
    dimension: "platform",
    description: "Channel wise platform data with a count and duration toggle."
  }),
  widget("platform-table", "table", "Channel Wise Platform Data Table", "platformDistribution", 8, 17, 4, 7, {
    metricMode: "count",
    columns: ["channel", "platforms"]
  }),
  widget("video-list", "table", "Video List", "videoList", 0, 24, 12, 7, {
    rowsLimit: 10,
    columns: ["title", "url", "published", "downloaded", "team", "type", "output", "user", "id", "channel"]
  })
];

export const frammerDashboardDefinition: DashboardDefinition = {
  // Bumped to v4 alongside the grid system stabilization — invalidates any
  // saved layouts from the previous broken react-grid-layout integration so
  // users start from a known-good preset.
  id: "frammer-main-dashboard-v4",
  title: "NewAnalyticsV1",
  widgets: defaultFrammerWidgets
};

function widget(
  id: WidgetSchema["id"],
  type: WidgetSchema["type"],
  title: WidgetSchema["title"],
  queryKey: WidgetSchema["queryKey"],
  x: number,
  y: number,
  w: number,
  h: number,
  config: WidgetSchema["config"]
): WidgetSchema {
  return {
    id,
    type,
    title,
    queryKey,
    size: w <= 2 ? "sm" : w <= 4 ? "md" : w <= 8 ? "lg" : "xl",
    position: { i: id, x, y, w, h, minW: type === "kpi" ? 2 : 3, minH: type === "kpi" ? 3 : 5 },
    visible: true,
    config
  };
}
