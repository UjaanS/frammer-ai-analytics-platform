import { videoRecords } from "@/lib/analytics/mock-data";
import type { VideoRecord } from "@/lib/analytics/types";
import type { DashboardContext, MetricMode, TimeGroup, WidgetConfig, WidgetQueryKey } from "@/lib/widgets/types";

export const platformKeys = ["Web App", "API", "Zapier", "Bulk Upload", "Mobile"];

export const platformPalette = [
  "hsl(var(--chart-5))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-2))"
];

export const chartColors = {
  uploaded: "hsl(var(--chart-1))",
  processed: "hsl(var(--chart-2))",
  published: "hsl(var(--chart-3))"
};

const queryCache = new Map<string, unknown>();

export function getWidgetData(queryKey: WidgetQueryKey, config: WidgetConfig, context?: DashboardContext) {
  const cacheKey = JSON.stringify({ queryKey, config, context });
  if (queryCache.has(cacheKey)) return queryCache.get(cacheKey);

  const records = filterRecordsForContext(videoRecords, context);
  const result = getContextualWidgetData(queryKey, config, records);
  queryCache.set(cacheKey, result);
  return result;
}

function getContextualWidgetData(queryKey: WidgetQueryKey, config: WidgetConfig, records: VideoRecord[]) {
  if (queryKey === "summary") return buildSummary(records);
  if (queryKey === "timeTrend") return buildTimeRows(records, config.timeGroup ?? "day");
  if (queryKey === "channelPerformance") return buildChannelRows(records);
  if (queryKey === "platformDistribution") return buildPlatformRows(records);
  if (queryKey === "videoList") return records.slice(0, config.rowsLimit ?? 10);
  if (queryKey === "qualityHeatmap") return buildQualityHeatmap();
  return {
    title: "NLQ-ready AI insight",
    body: "This placeholder is intentionally metadata-driven. Later, NLQ can generate a widget schema with a queryKey, metric, dimension, and chart type."
  };
}

export function filterRecordsForContext(records: VideoRecord[], context?: DashboardContext) {
  if (!context) return records;

  const { filters, dateRange } = context;
  return records.filter((record) => {
    const uploadedAt = record.uploadedAt;
    if (uploadedAt < dateRange.start || uploadedAt > dateRange.end) return false;
    if (!matchesValue(filters.company, "AAA - Frammer AI", record.company)) return false;
    if (!matchesValue(filters.channel, "Channel-Frammer AI", record.channel)) return false;
    if (!matchesValue(filters.user, "all", record.user)) return false;
    if (!matchesValue(filters.videoType, "all", record.inputType)) return false;
    if (!matchesValue(filters.published, "all", record.publishedStatus)) return false;

    if (filters.dimension !== "none" && filters.dimensionFilter !== "none") {
      return matchesDimensionFilter(record, filters.dimension, filters.dimensionFilter);
    }

    return true;
  });
}

export function getMetricValue(record: VideoRecord, metric: string) {
  if (metric === "uploaded") return 1;
  if (metric === "processed") return record.publishedStatus === "Failed" ? 0 : 1;
  if (metric === "published") return record.publishedStatus === "Published" ? 1 : 0;
  if (metric === "downloads") return record.downloads;
  if (metric === "duration") return record.durationMinutes;
  if (metric === "processing") return record.processingMinutes;
  return 0;
}

export function buildSummary(records: VideoRecord[]) {
  const uploaded = records.length;
  const processed = records.filter((record) => record.publishedStatus !== "Failed").length;
  const published = records.filter((record) => record.publishedStatus === "Published").length;
  const downloads = records.reduce((sum, record) => sum + record.downloads, 0);
  const uploadedDuration = records.reduce((sum, record) => sum + record.durationMinutes, 0);
  const processedDuration = records.reduce((sum, record) => sum + record.processingMinutes, 0);
  const publishedDuration = records
    .filter((record) => record.publishedStatus === "Published")
    .reduce((sum, record) => sum + record.durationMinutes, 0);

  return {
    uploaded,
    processed,
    published,
    downloads,
    uploadedDuration,
    processedDuration,
    publishedDuration,
    publishRate: Math.round((published / uploaded) * 100),
    downloadRate: downloads / Math.max(1, published),
    avgProcessing: Math.round(processedDuration / Math.max(1, processed))
  };
}

export function buildTimeRows(records: VideoRecord[], group: TimeGroup) {
  const grouped = new Map<string, ReturnType<typeof createEmptyTimeRow>>();

  for (const record of records) {
    const date = new Date(`${record.uploadedAt}T00:00:00`);
    const label =
      group === "day"
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : group === "month"
          ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
          : String(date.getFullYear());
    const row = grouped.get(label) ?? createEmptyTimeRow(label);
    row.uploaded += 1;
    row.uploadedDuration += record.durationMinutes;
    if (record.publishedStatus !== "Failed") {
      row.processed += 1;
      row.processedDuration += record.processingMinutes;
    }
    if (record.publishedStatus === "Published") {
      row.published += 1;
      row.publishedDuration += record.durationMinutes;
    }
    grouped.set(label, row);
  }

  return Array.from(grouped.values());
}

export function buildChannelRows(records: VideoRecord[]) {
  const grouped = new Map<string, ReturnType<typeof createEmptyChannelRow>>();

  for (const record of records) {
    const row = grouped.get(record.channel) ?? createEmptyChannelRow(record.channel);
    row.uploaded += 1;
    row.uploadedDuration += record.durationMinutes;
    if (record.publishedStatus !== "Failed") {
      row.processed += 1;
      row.processedDuration += record.processingMinutes;
    }
    if (record.publishedStatus === "Published") {
      row.published += 1;
      row.publishedDuration += record.durationMinutes;
    }
    grouped.set(record.channel, row);
  }

  return Array.from(grouped.values()).sort((a, b) => b.published - a.published);
}

export function buildPlatformRows(records: VideoRecord[]) {
  const grouped = new Map<string, Record<string, string | number>>();

  for (const record of records) {
    const row = grouped.get(record.channel) ?? { channel: record.channel };
    row[`${record.platform}-count`] = Number(row[`${record.platform}-count`] ?? 0) + 1;
    row[`${record.platform}-duration`] = Number(row[`${record.platform}-duration`] ?? 0) + record.durationMinutes;
    grouped.set(record.channel, row);
  }

  return Array.from(grouped.values());
}

export function formatMinutes(minutes: number) {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatMetricValue(value: number, mode: MetricMode) {
  return mode === "count" ? value.toLocaleString() : formatMinutes(value);
}

export function calculateDelta(current: number, comparison: number) {
  const delta = current - comparison;
  const percent = comparison === 0 ? (current > 0 ? 100 : 0) : Math.round((delta / comparison) * 100);

  return {
    delta,
    percent,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat"
  };
}

export function timeGroupLabel(group: TimeGroup) {
  if (group === "day") return "Day";
  if (group === "month") return "Month";
  return "Year";
}

function createEmptyTimeRow(label: string) {
  return {
    label,
    uploaded: 0,
    processed: 0,
    published: 0,
    uploadedDuration: 0,
    processedDuration: 0,
    publishedDuration: 0
  };
}

function createEmptyChannelRow(channel: string) {
  return {
    channel,
    uploaded: 0,
    processed: 0,
    published: 0,
    uploadedDuration: 0,
    processedDuration: 0,
    publishedDuration: 0
  };
}

function buildQualityHeatmap() {
  return [
    [12, 8, 5, 2],
    [6, 11, 7, 4],
    [3, 6, 9, 13]
  ];
}

function matchesValue(filterValue: string, allValue: string, recordValue: string) {
  if (filterValue === "AAA - Frammer AI") return true;
  return filterValue === allValue || filterValue === recordValue;
}

function matchesDimensionFilter(record: VideoRecord, dimension: string, filter: string) {
  if (filter === "top-10" || filter === "bottom-10") return true;
  if (filter === "custom") return record[dimension as keyof VideoRecord] !== undefined;
  return true;
}
