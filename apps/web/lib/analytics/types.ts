export type DimensionKey =
  | "company"
  | "channel"
  | "user"
  | "team"
  | "language"
  | "platform"
  | "publishedStatus"
  | "inputType"
  | "outputType"
  | "billableStatus"
  | "qualityFlag";

export type MetricKey =
  | "uploaded"
  | "processed"
  | "published"
  | "downloaded"
  | "durationMinutes"
  | "processingMinutes"
  | "qualityIssues"
  | "revenue";

export type FilterState = {
  dateRange: string;
  comparisonRange: string;
  company: string;
  channel: string;
  users: string[];
  language: string;
  platform: string;
  publishedStatus: string;
  inputType: string;
  outputType: string;
  dimension1: DimensionKey;
  dimension2: DimensionKey;
  metric: MetricKey;
  billableStatus: string;
  dataQualityFlags: string[];
};

export type VideoRecord = {
  id: string;
  title: string;
  company: string;
  channel: string;
  user: string;
  team: string;
  language: string;
  platform: string;
  publishedStatus: "Published" | "Scheduled" | "Draft" | "Failed";
  inputType: "Long Form" | "Webinar" | "Podcast" | "Livestream" | "Raw Clip";
  outputType: "Reel" | "Short" | "Summary" | "Carousel" | "Transcript";
  billableStatus: "Billable" | "Non-billable" | "Review";
  qualityFlag: "Clean" | "Missing metadata" | "Duplicate ID" | "Invalid URL" | "Unknown mapping" | "Failed job";
  uploadedAt: string;
  durationMinutes: number;
  processingMinutes: number;
  downloads: number;
  views: number;
  qualityScore: number;
};

export type TrendPoint = {
  date: string;
  uploads: number;
  processed: number;
  published: number;
  downloads: number;
  duration: number;
  previous: number;
};

export type KpiMetric = {
  label: string;
  value: string;
  secondary: string;
  trend: number;
  status: "good" | "warning" | "critical";
  sparkline: number[];
};

export type Insight = {
  title: string;
  description: string;
  impact: string;
  tone: "positive" | "warning" | "critical" | "neutral";
};

export type DimensionOption = {
  key: DimensionKey;
  label: string;
};

export type MetricOption = {
  key: MetricKey;
  label: string;
};
