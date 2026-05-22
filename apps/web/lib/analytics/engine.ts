import type { DimensionKey, FilterState, MetricKey, VideoRecord } from "./types";

export type DimensionRow = {
  dimension1: string;
  dimension2: string;
  value: number;
  count: number;
};

export const dimensionLabels: Record<DimensionKey, string> = {
  company: "Company",
  channel: "Channel",
  user: "User",
  team: "Team",
  language: "Language",
  platform: "Platform",
  publishedStatus: "Publish Status",
  inputType: "Input Type",
  outputType: "Output Type",
  billableStatus: "Billable Status",
  qualityFlag: "Quality Flag"
};

export const metricLabels: Record<MetricKey, string> = {
  uploaded: "Uploaded",
  processed: "Processed",
  published: "Published",
  downloaded: "Downloaded",
  durationMinutes: "Duration",
  processingMinutes: "Processing Time",
  qualityIssues: "Quality Issues",
  revenue: "Billable Value"
};

export function getRecordMetric(record: VideoRecord, metric: MetricKey): number {
  if (metric === "uploaded") return 1;
  if (metric === "processed") return record.publishedStatus === "Failed" ? 0 : 1;
  if (metric === "published") return record.publishedStatus === "Published" ? 1 : 0;
  if (metric === "downloaded") return record.downloads;
  if (metric === "durationMinutes") return record.durationMinutes;
  if (metric === "processingMinutes") return record.processingMinutes;
  if (metric === "qualityIssues") return record.qualityFlag === "Clean" ? 0 : 1;
  return record.billableStatus === "Billable" ? record.durationMinutes * 12 : 0;
}

export function applyAnalyticsFilters(records: VideoRecord[], filters: FilterState): VideoRecord[] {
  return records.filter((record) => {
    if (filters.company !== "all" && record.company !== filters.company) return false;
    if (filters.channel !== "all" && record.channel !== filters.channel) return false;
    if (filters.users.length && !filters.users.includes(record.user)) return false;
    if (filters.language !== "all" && record.language !== filters.language) return false;
    if (filters.platform !== "all" && record.platform !== filters.platform) return false;
    if (filters.publishedStatus !== "all" && record.publishedStatus !== filters.publishedStatus) return false;
    if (filters.inputType !== "all" && record.inputType !== filters.inputType) return false;
    if (filters.outputType !== "all" && record.outputType !== filters.outputType) return false;
    if (filters.billableStatus !== "all" && record.billableStatus !== filters.billableStatus) return false;
    if (filters.dataQualityFlags.length && !filters.dataQualityFlags.includes(record.qualityFlag)) return false;
    return true;
  });
}

export function buildMultiDimensionRows(
  records: VideoRecord[],
  dimension1: DimensionKey,
  dimension2: DimensionKey,
  metric: MetricKey
): DimensionRow[] {
  const grouped = new Map<string, DimensionRow>();

  for (const record of records) {
    const first = String(record[dimension1]);
    const second = String(record[dimension2]);
    const key = `${first}::${second}`;
    const current = grouped.get(key) ?? {
      dimension1: first,
      dimension2: second,
      value: 0,
      count: 0
    };

    current.value += getRecordMetric(record, metric);
    current.count += 1;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((a, b) => b.value - a.value);
}

export function aggregateByDimension(
  records: VideoRecord[],
  dimension: DimensionKey,
  metric: MetricKey
) {
  const grouped = new Map<string, { name: string; value: number; count: number }>();

  for (const record of records) {
    const name = String(record[dimension]);
    const current = grouped.get(name) ?? { name, value: 0, count: 0 };
    current.value += getRecordMetric(record, metric);
    current.count += 1;
    grouped.set(name, current);
  }

  return Array.from(grouped.values()).sort((a, b) => b.value - a.value);
}

export function calculateQualityScore(records: VideoRecord[]) {
  if (!records.length) return 0;
  return Math.round(records.reduce((total, record) => total + record.qualityScore, 0) / records.length);
}
