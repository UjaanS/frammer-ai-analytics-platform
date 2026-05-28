import type { DashboardDefinition, WidgetSchema } from "@/lib/widgets/types";

// ---------------------------------------------------------------------------
// Persona presets
// ---------------------------------------------------------------------------
// Three dashboard definitions tailored to different audiences. Each has its
// own `id`, which scopes the localStorage layout state in useDashboardState
// (storage key = `frammer-dashboard:<id>`). Switching personas swaps the
// active definition and gives the user a fresh, persona-appropriate view.
//
// Widget IDs are unique within a definition; the same id can appear across
// personas without collision because localStorage is scoped per definition.

export type Persona = "client" | "admin" | "tech";

// ---------------------------------------------------------------------------
// CLIENT — outcomes view. Focused on what was actually delivered + reach.
// Lean widget set; minimal operational noise.
// ---------------------------------------------------------------------------
const clientWidgets: WidgetSchema[] = [
  widget("kpi-published", "kpi", "Published Videos", "summary", 0, 0, 3, 2, { metric: "published" }),
  widget("kpi-downloads", "kpi", "Downloads", "summary", 3, 0, 3, 2, { metric: "downloads" }),
  widget("kpi-publish-rate", "kpi", "Publish Rate", "summary", 6, 0, 3, 2, { metric: "publishRate" }),
  widget("kpi-processing", "kpi", "Avg Processing", "summary", 9, 0, 3, 2, { metric: "avgProcessing" }),
  widget("trend-chart", "line-chart", "Publishing Trend", "timeTrend", 0, 2, 8, 7, {
    metricMode: "count",
    timeGroup: "day",
    description: "Daily publishing activity."
  }),
  widget("channel-pie", "pie-chart", "Top Channels", "channelPerformance", 8, 2, 4, 7, {
    description: "Where your published content went."
  }),
  widget("channel-chart", "bar-chart", "Channel Performance", "channelPerformance", 0, 9, 8, 7, {
    metricMode: "count",
    dimension: "channel",
    description: "Channel-level publish counts."
  }),
  widget("video-list", "table", "Recent Videos", "videoList", 0, 16, 12, 7, {
    rowsLimit: 10,
    columns: ["title", "url", "published", "downloaded", "team", "type", "output", "user", "id", "channel"]
  })
];

// ---------------------------------------------------------------------------
// ADMIN — operational pipeline. The full funnel from upload to publish.
// ---------------------------------------------------------------------------
const adminWidgets: WidgetSchema[] = [
  widget("kpi-uploaded", "kpi", "Uploaded Videos", "summary", 0, 0, 2, 2, { metric: "uploaded" }),
  widget("kpi-processed", "kpi", "Processed Videos", "summary", 2, 0, 2, 2, { metric: "processed" }),
  widget("kpi-published", "kpi", "Published Videos", "summary", 4, 0, 2, 2, { metric: "published" }),
  widget("kpi-downloads", "kpi", "Downloads", "summary", 6, 0, 2, 2, { metric: "downloads" }),
  widget("kpi-publish-rate", "kpi", "Publish Rate", "summary", 8, 0, 2, 2, { metric: "publishRate" }),
  widget("kpi-processing", "kpi", "Avg Processing", "summary", 10, 0, 2, 2, { metric: "avgProcessing" }),
  widget("trend-chart", "line-chart", "Pipeline Trend", "timeTrend", 0, 2, 8, 7, {
    metricMode: "count",
    timeGroup: "day",
    description: "Uploaded, processed, and published over time."
  }),
  widget("trend-table", "table", "Pipeline Table", "timeTrend", 8, 2, 4, 7, {
    metricMode: "count",
    timeGroup: "day",
    columns: ["time", "uploaded", "processed", "published"]
  }),
  widget("channel-chart", "bar-chart", "Channel Performance", "channelPerformance", 0, 9, 8, 7, {
    metricMode: "count",
    dimension: "channel",
    description: "Channel volume with count / duration toggle."
  }),
  widget("channel-table", "table", "Channel Table", "channelPerformance", 8, 9, 4, 7, {
    metricMode: "count",
    columns: ["channel", "uploaded", "processed", "published"]
  }),
  widget("platform-chart", "bar-chart", "Platform Distribution", "platformDistribution", 0, 16, 8, 7, {
    metricMode: "count",
    dimension: "platform",
    description: "Channel x platform breakdown."
  }),
  widget("platform-table", "table", "Platform Table", "platformDistribution", 8, 16, 4, 7, {
    metricMode: "count",
    columns: ["channel", "platforms"]
  }),
  widget("video-list", "table", "Video List", "videoList", 0, 23, 12, 7, {
    rowsLimit: 10,
    columns: ["title", "url", "published", "downloaded", "team", "type", "output", "user", "id", "channel"]
  })
];

// ---------------------------------------------------------------------------
// TECH ADMIN — system health view. Quality, throughput, and anomalies.
// ---------------------------------------------------------------------------
const techWidgets: WidgetSchema[] = [
  widget("kpi-uploaded", "kpi", "Uploaded Videos", "summary", 0, 0, 3, 2, { metric: "uploaded" }),
  widget("kpi-processed", "kpi", "Processed Videos", "summary", 3, 0, 3, 2, { metric: "processed" }),
  widget("kpi-publish-rate", "kpi", "Publish Rate", "summary", 6, 0, 3, 2, { metric: "publishRate" }),
  widget("kpi-processing", "kpi", "Avg Processing", "summary", 9, 0, 3, 2, { metric: "avgProcessing" }),
  widget("trend-chart", "line-chart", "Processing Trend", "timeTrend", 0, 2, 8, 7, {
    metricMode: "duration",
    timeGroup: "day",
    description: "Processing throughput over time."
  }),
  widget("quality-heatmap", "heatmap", "Quality Heatmap", "qualityHeatmap", 8, 2, 4, 7, {
    description: "Quality issue density by category."
  }),
  widget("platform-chart", "bar-chart", "Platform Distribution", "platformDistribution", 0, 9, 8, 7, {
    metricMode: "count",
    dimension: "platform",
    description: "Where content arrives from."
  }),
  widget("ai-insight", "ai-insight", "System Insight", "aiInsight", 8, 9, 4, 7, {
    description: "AI-generated system observations."
  }),
  widget("video-list", "table", "Recent Activity", "videoList", 0, 16, 12, 7, {
    rowsLimit: 10,
    columns: ["title", "url", "published", "downloaded", "team", "type", "output", "user", "id", "channel"]
  })
];

// ---------------------------------------------------------------------------
// Definitions + lookup map
// ---------------------------------------------------------------------------

export const clientDashboardDefinition: DashboardDefinition = {
  id: "frammer-dashboard-v5-client",
  title: "Client View",
  widgets: clientWidgets
};

export const adminDashboardDefinition: DashboardDefinition = {
  id: "frammer-dashboard-v5-admin",
  title: "Admin View",
  widgets: adminWidgets
};

export const techDashboardDefinition: DashboardDefinition = {
  id: "frammer-dashboard-v5-tech",
  title: "Tech Admin View",
  widgets: techWidgets
};

export const personaDefinitions: Record<Persona, DashboardDefinition> = {
  client: clientDashboardDefinition,
  admin: adminDashboardDefinition,
  tech: techDashboardDefinition
};

export const personaLabels: Record<Persona, string> = {
  client: "Client",
  admin: "Admin",
  tech: "Tech Admin"
};

// ---------------------------------------------------------------------------
// Backward-compat: keep the old export so any non-feature code still resolves.
// New code should reference personaDefinitions[persona] directly.
// ---------------------------------------------------------------------------
export const defaultFrammerWidgets = adminWidgets;
export const frammerDashboardDefinition = adminDashboardDefinition;

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
    position: { i: id, x, y, w, h, minW: type === "kpi" ? 2 : 3, minH: type === "kpi" ? 2 : 5 },
    visible: true,
    config
  };
}
