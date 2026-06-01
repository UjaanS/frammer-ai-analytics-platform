export const semanticMetrics = [
  { id: "videosIngested", label: "Original videos ingested", available: true },
  { id: "generatedOutputs", label: "Generated outputs", available: true },
  { id: "processingSuccessRate", label: "Processing success rate", available: true },
  { id: "processingErrorRate", label: "Processing error rate", available: true },
  { id: "processingBacklog", label: "Processing backlog", available: true },
  { id: "processingTurnaround", label: "Processing turnaround", available: true },
  { id: "outputYield", label: "Output yield", available: true },
  { id: "serviceCompletionRate", label: "Service completion rate", available: true },
  { id: "serviceBacklog", label: "Service backlog", available: true },
  { id: "publishScheduleCompletionRate", label: "Publish schedule completion rate", available: true },
  { id: "metadataCompleteness", label: "Metadata completeness", available: true },
  { id: "clipcutCompletionRate", label: "Clip-cut completion rate", available: true },
  { id: "downloads", label: "Downloads", available: false },
  { id: "views", label: "Views", available: false },
  { id: "revenue", label: "Revenue", available: false },
  { id: "creditConsumption", label: "Credit consumption", available: false }
] as const;

export const semanticDimensions = [
  "date",
  "company",
  "channel",
  "user",
  "language",
  "videoType",
  "serviceType",
  "sourcePlatform",
  "publishPlatform",
  "status"
] as const;
