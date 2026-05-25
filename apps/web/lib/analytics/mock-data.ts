import type { DimensionOption, Insight, KpiMetric, MetricOption, TrendPoint, VideoRecord } from "./types";

export const companies = ["Frammer AI", "Northstar Media", "Atlas Learning", "Signal Commerce"];
export const channels = ["YouTube", "Instagram", "TikTok", "LinkedIn", "X", "Newsletter"];
export const users = ["Aarav Mehta", "Maya Chen", "Noah Williams", "Priya Kapoor", "Sofia Garcia", "Ethan Park"];
export const teams = ["Growth", "Editorial", "Customer Success", "Product Marketing"];
export const languages = ["English", "Hindi", "Spanish", "French", "German", "Japanese"];
export const platforms = ["Web App", "API", "Zapier", "Bulk Upload", "Mobile"];
export const inputTypes = ["Long Form", "Webinar", "Podcast", "Livestream", "Raw Clip"];
export const outputTypes = ["Reel", "Short", "Summary", "Carousel", "Transcript"];
export const publishedStatuses = ["Published", "Scheduled", "Draft", "Failed"];
export const billableStatuses = ["Billable", "Non-billable", "Review"];
export const qualityFlags = ["Clean", "Missing metadata", "Duplicate ID", "Invalid URL", "Unknown mapping", "Failed job"];

export const dimensionOptions: DimensionOption[] = [
  { key: "channel", label: "Channel" },
  { key: "language", label: "Language" },
  { key: "user", label: "User" },
  { key: "team", label: "Team" },
  { key: "platform", label: "Platform" },
  { key: "publishedStatus", label: "Publish Status" },
  { key: "inputType", label: "Input Type" },
  { key: "outputType", label: "Output Type" },
  { key: "company", label: "Company" },
  { key: "billableStatus", label: "Billable Status" },
  { key: "qualityFlag", label: "Data Quality Flag" }
];

export const metricOptions: MetricOption[] = [
  { key: "uploaded", label: "Uploaded Videos" },
  { key: "processed", label: "Processed Videos" },
  { key: "published", label: "Published Videos" },
  { key: "downloaded", label: "Downloads" },
  { key: "durationMinutes", label: "Duration Minutes" },
  { key: "processingMinutes", label: "Processing Minutes" },
  { key: "qualityIssues", label: "Quality Issues" },
  { key: "revenue", label: "Billable Value" }
];

const channelWeights = [1.15, 1.08, 1.04, 0.82, 0.68, 0.48];

export const trendData: TrendPoint[] = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const base = 80 + Math.round(Math.sin(index / 4) * 18) + index;
  return {
    date: `May ${day}`,
    uploads: base,
    processed: Math.round(base * 0.91),
    published: Math.round(base * 0.66),
    downloads: Math.round(base * 1.85),
    duration: Math.round(base * 7.4),
    previous: Math.round((base - 7) * 0.88)
  };
});

export const videoRecords: VideoRecord[] = Array.from({ length: 96 }, (_, index) => {
  const channel = channels[index % channels.length];
  const company = companies[index % companies.length];
  const outputType = outputTypes[(index + 2) % outputTypes.length] as VideoRecord["outputType"];
  const status = publishedStatuses[(index + (index % 5 === 0 ? 3 : 0)) % publishedStatuses.length] as VideoRecord["publishedStatus"];
  const qualityFlag = qualityFlags[
    index % 17 === 0
      ? 5
      : index % 13 === 0
        ? 4
        : index % 11 === 0
          ? 3
          : index % 7 === 0
            ? 2
            : index % 5 === 0
              ? 1
              : 0
  ] as VideoRecord["qualityFlag"];
  const weight = channelWeights[index % channelWeights.length];
  const durationMinutes = Math.round((12 + (index % 9) * 8) * weight);

  return {
    id: `VID-${String(index + 1001).padStart(5, "0")}`,
    title: `${outputType} package for ${company} campaign ${index + 1}`,
    company,
    channel,
    user: users[index % users.length],
    team: teams[(index + 1) % teams.length],
    language: languages[(index + 2) % languages.length],
    platform: platforms[(index + 3) % platforms.length],
    publishedStatus: status,
    inputType: inputTypes[(index + 1) % inputTypes.length] as VideoRecord["inputType"],
    outputType,
    billableStatus: billableStatuses[index % billableStatuses.length] as VideoRecord["billableStatus"],
    qualityFlag,
    uploadedAt: `2026-05-${String((index % 28) + 1).padStart(2, "0")}`,
    durationMinutes,
    processingMinutes: Math.max(4, Math.round(durationMinutes * (0.28 + (index % 4) * 0.07))),
    downloads: Math.round((index % 17) * 8 * weight + 24),
    views: Math.round((index % 23) * 420 * weight + 1800),
    qualityScore: qualityFlag === "Clean" ? 94 - (index % 6) : 78 - (index % 12)
  };
});

export const kpiMetrics: KpiMetric[] = [
  { label: "Uploaded Videos", value: "2,842", secondary: "+318 vs prior period", trend: 12.4, status: "good", sparkline: [22, 28, 31, 29, 38, 44, 49] },
  { label: "Processed Videos", value: "2,594", secondary: "91.3% processing rate", trend: 9.8, status: "good", sparkline: [20, 26, 29, 28, 35, 39, 45] },
  { label: "Published Videos", value: "1,876", secondary: "66.0% of uploads", trend: 6.1, status: "warning", sparkline: [18, 19, 24, 27, 25, 31, 34] },
  { label: "Publish Conversion Rate", value: "66.0%", secondary: "-3.4 pts vs target", trend: -3.4, status: "warning", sparkline: [72, 70, 71, 68, 69, 66, 66] },
  { label: "Downloads", value: "5,216", secondary: "1.8 downloads per upload", trend: 18.7, status: "good", sparkline: [40, 43, 49, 51, 60, 63, 72] },
  { label: "Processing Efficiency", value: "72%", secondary: "Median 18 min latency", trend: -4.2, status: "critical", sparkline: [82, 80, 78, 76, 75, 73, 72] }
];

export const insights: Insight[] = [
  {
    title: "LinkedIn summaries are outperforming",
    description: "Summary output on LinkedIn has the strongest publish conversion and a 21% shorter processing path.",
    impact: "+14.2% conversion",
    tone: "positive"
  },
  {
    title: "Bulk Upload latency is elevated",
    description: "Bulk Upload jobs are clustering around larger files and have become the main processing bottleneck.",
    impact: "+11 min median latency",
    tone: "warning"
  },
  {
    title: "Duplicate IDs need cleanup",
    description: "Duplicate source IDs are concentrated in Northstar Media uploads from API integrations.",
    impact: "18 affected videos",
    tone: "critical"
  }
];

export const anomalyAlerts: Insight[] = [
  {
    title: "Publish conversion dropped on TikTok",
    description: "TikTok conversion is 9.6 points below its 14-day baseline.",
    impact: "Investigate channel workflow",
    tone: "warning"
  },
  {
    title: "Unknown language mapping spike",
    description: "Japanese and German clips show a higher rate of missing mapping values.",
    impact: "32 records flagged",
    tone: "critical"
  }
];
