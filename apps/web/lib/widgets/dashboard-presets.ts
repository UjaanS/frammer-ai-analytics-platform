import type { DashboardDefinition, WarehouseWidgetQuery, WidgetSchema } from "@/lib/widgets/types";
import type { WarehouseDatasetId, WarehouseMetricAggregation } from "@/lib/analytics/warehouse";

export type Persona = "client" | "admin" | "tech";

const clientWidgets: WidgetSchema[] = [
  kpi("kpi-videos-ingested", "Videos Ingested", "videosIngested", 0),
  kpi("kpi-generated-outputs", "Generated Outputs", "generatedOutputs", 2),
  kpi("kpi-output-yield", "Output Yield", "outputYield", 4),
  kpi("kpi-processing-turnaround", "Average Turnaround", "processingTurnaround", 6),
  kpi("kpi-publish-throughput", "Publish Throughput", "publishThroughput", 8),
  widget("production-funnel", "funnel-chart", "Production Funnel", "summary", 0, 2, 6, 6, {
    description: "Original videos to generated outputs to completed publish schedules.",
    funnelStages: [
      { label: "Videos Ingested", metricId: "videosIngested" },
      { label: "Generated Outputs", metricId: "generatedOutputs" },
      { label: "Published Schedules", metricId: "publishThroughput" }
    ],
    warehouseQuery: warehouse("videos", ["videoType"], "recordCount")
  }),
  widget("yield-by-channel", "bar-chart", "Yield by Channel", "channelPerformance", 6, 2, 6, 6, {
    description: "Generated child outputs per ingested original by channel.",
    warehouseQuery: warehouse("videos", ["channel"], "outputYield", "rate")
  }),
  widget("content-mix", "pie-chart", "Content Mix", "channelPerformance", 0, 8, 6, 6, {
    description: "Imported videos by output type.",
    warehouseQuery: warehouse("videos", ["videoType"], "recordCount")
  }),
  explorer("operational-explorer", 0, 14)
];

const adminWidgets: WidgetSchema[] = [
  kpi("kpi-uploaded", "Uploaded Videos", "uploaded", 0),
  kpi("kpi-processed", "Processed Videos", "processed", 2),
  kpi("kpi-published", "Published Videos", "published", 4),
  kpi("kpi-reels", "Reels", "reels", 6),
  kpi("kpi-chapters", "Chapters", "chapters", 8),
  kpi("kpi-shorts", "Shorts Videos", "shortsVideos", 10),
  widget("kpi-mkm", "kpi", "MKM Videos", "summary", 0, 2, 2, 2, { metricId: "mkmVideos" }),
  widget("kpi-viral", "kpi", "Viral Videos", "summary", 2, 2, 2, 2, { metricId: "viralVideos" }),
  widget("kpi-replaced", "kpi", "Replaced Videos", "summary", 4, 2, 2, 2, { metricId: "replacedVideos" }),
  widget("kpi-non-billable", "kpi", "Non-Billable Videos", "summary", 6, 2, 2, 2, { metricId: "nonBillableVideos" }),
  widget("kpi-videos-downloaded", "kpi", "Videos Downloaded", "summary", 8, 2, 2, 2, { metricId: "videosDownloaded" }),
  widget("trend-chart", "line-chart", "Unified Time Trend", "timeTrend", 0, 4, 8, 7, {
    metricMode: "count",
    timeGroup: "day",
    description: "Uploaded, processed, and published over time."
  }),
  widget("trend-table", "table", "Pipeline Table", "timeTrend", 8, 4, 4, 7, {
    metricMode: "count",
    timeGroup: "day",
    columns: ["time", "uploaded", "processed", "published"]
  }),
  widget("channel-chart", "bar-chart", "Channel Performance", "channelPerformance", 0, 11, 8, 7, {
    metricMode: "count",
    dimension: "channel",
    description: "Channel volume with count / duration toggle."
  }),
  widget("channel-table", "table", "Channel Table", "channelPerformance", 8, 11, 4, 7, {
    metricMode: "count",
    columns: ["channel", "uploaded", "processed", "published"]
  }),
  widget("platform-chart", "bar-chart", "Platform Distribution", "platformDistribution", 0, 18, 8, 7, {
    metricMode: "count",
    dimension: "platform",
    description: "Channel x platform breakdown."
  }),
  widget("platform-table", "table", "Platform Table", "platformDistribution", 8, 18, 4, 7, {
    metricMode: "count",
    columns: ["channel", "platforms"]
  }),
  explorer("operational-explorer", 0, 25)
];

const techWidgets: WidgetSchema[] = [
  kpi("kpi-service-error-rate", "Service Error Rate", "serviceErrorRate", 0),
  kpi("kpi-service-error-volume", "Error Volume", "serviceErrorVolume", 2),
  kpi("kpi-stuck-jobs", "Stuck Jobs Over 24h", "stuckServiceJobs24h", 4),
  kpi("kpi-metadata-completeness", "Metadata Completeness", "metadataCompleteness", 6),
  kpi("kpi-recorded-quality", "Recorded Quality Issues", "recordedQualityIssues", 8),
  widget("errors-by-service", "bar-chart", "Error Breakdown by Service Type", "channelPerformance", 0, 2, 6, 6, {
    description: "Errored service requests grouped by service type.",
    warehouseQuery: warehouse("serviceRequests", ["serviceType"], "recordCount", "count", { status: "error" })
  }),
  widget("turnaround-distribution", "bar-chart", "Processing Turnaround Distribution", "channelPerformance", 6, 2, 6, 6, {
    description: "Video processing duration buckets.",
    warehouseQuery: warehouse("videos", ["processingTurnaroundBucket"], "recordCount")
  }),
  widget("quality-trend", "line-chart", "Quality Issue Trends", "timeTrend", 0, 8, 6, 6, {
    description: "Recorded warehouse load findings over time.",
    warehouseQuery: warehouse("qualityIssues", ["date"], "recordCount")
  }),
  widget("platform-health", "bar-chart", "Publish Platform Health", "platformDistribution", 6, 8, 6, 6, {
    description: "Publish schedule completion rate by platform.",
    warehouseQuery: warehouse("publishSchedules", ["publishPlatform"], "completionRate", "rate")
  }),
  explorer("operational-explorer", 0, 14)
];

export const clientDashboardDefinition = definition("frammer-dashboard-v8-client", "Client View", clientWidgets);
export const adminDashboardDefinition = definition("frammer-dashboard-v9-admin", "Admin View", adminWidgets);
export const techDashboardDefinition = definition("frammer-dashboard-v8-tech", "Tech Admin View", techWidgets);

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

export const defaultFrammerWidgets = adminWidgets;
export const frammerDashboardDefinition = adminDashboardDefinition;

function definition(id: string, title: string, widgets: WidgetSchema[]): DashboardDefinition {
  return { id, title, widgets, comparisonWidgets: comparisonLayout(widgets) };
}

function comparisonLayout(widgets: WidgetSchema[]) {
  let y = 0;
  let kpiX = 0;
  return widgets.map((item) => {
    const isKpi = item.type === "kpi";
    const w = isKpi ? 2 : 6;
    const h = isKpi ? 2 : item.type === "warehouse-explorer" ? 7 : 6;
    const x = isKpi ? kpiX : 0;
    const positioned = { ...item, position: { ...item.position, x, y, w, h } };
    if (isKpi) {
      kpiX += 2;
      if (kpiX >= 6) {
        kpiX = 0;
        y += 2;
      }
    } else {
      if (kpiX) {
        kpiX = 0;
        y += 2;
        positioned.position.y = y;
      }
      y += h;
    }
    return positioned;
  });
}

function kpi(id: string, title: string, metricId: string, x: number) {
  return widget(id, "kpi", title, "summary", x, 0, 2, 2, { metricId });
}

function explorer(id: string, x: number, y: number) {
  return widget(id, "warehouse-explorer", "Operational Data Explorer", "videoList", x, y, 12, 7, {
    description: "Search, group, export, and drill into imported warehouse records.",
    warehouseQuery: warehouse("videos", ["channel"], "recordCount", "count", undefined, 25)
  });
}

function warehouse(
  dataset: WarehouseDatasetId,
  groupBy: string[],
  metricId: string,
  aggregation: WarehouseMetricAggregation = "count",
  fixedDimensionFilters?: Record<string, string>,
  limit = 500
): WarehouseWidgetQuery {
  return {
    dataset,
    groupBy,
    metrics: [{ id: metricId, aggregation }],
    fixedDimensionFilters,
    sortBy: groupBy[0] === "date" ? "date" : metricId,
    sortDirection: groupBy[0] === "date" ? "asc" : "desc",
    limit
  };
}

function widget(
  id: string,
  type: WidgetSchema["type"],
  title: string,
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
