import type { Layout } from "react-grid-layout";

export type DateRange = {
  start: string;
  end: string;
};

export type ReportFilterState = {
  comparison: string;
  company: string;
  channel: string;
  user: string;
  videoType: string;
  dimension: string;
  dimensionFilter: string;
  published: string;
};

export type DashboardContext = {
  id: string;
  label: string;
  filters: ReportFilterState;
  dateRange: DateRange;
  dimensions?: Record<string, string | number | boolean | string[]>;
};

export type CompareBy = "time" | "dimension" | "custom";
export type ComparisonViewMode = "split" | "overlay";

export type DashboardState = {
  compareMode: boolean;
  compareBy: CompareBy;
  viewMode: ComparisonViewMode;
  syncFilters: boolean;
  syncHover: boolean;
  contexts: DashboardContext[];
};

export type WidgetType =
  | "kpi"
  | "line-chart"
  | "bar-chart"
  | "pie-chart"
  | "table"
  | "heatmap"
  | "ai-insight";

export type WidgetSize = "sm" | "md" | "lg" | "xl";

export type MetricMode = "count" | "duration";
export type TimeGroup = "day" | "month" | "year";

export type WidgetQueryKey =
  | "summary"
  | "timeTrend"
  | "channelPerformance"
  | "platformDistribution"
  | "videoList"
  | "qualityHeatmap"
  | "aiInsight";

export type WidgetConfig = {
  metric?: string;
  metricMode?: MetricMode;
  timeGroup?: TimeGroup;
  dimension?: string;
  columns?: string[];
  rowsLimit?: number;
  showTable?: boolean;
  description?: string;
};

export type WidgetSchema = {
  id: string;
  type: WidgetType;
  title: string;
  queryKey: WidgetQueryKey;
  filters?: Record<string, string | string[] | number | boolean>;
  size: WidgetSize;
  position: Layout;
  visible?: boolean;
  config: WidgetConfig;
};

export type DashboardDefinition = {
  id: string;
  title: string;
  widgets: WidgetSchema[];
  // Optional alternate layout used when the dashboard renders inside a
  // narrow comparison panel. Falls back to `widgets` when not provided.
  comparisonWidgets?: WidgetSchema[];
};

export type LayoutMode = "dashboard" | "comparison";

export type WidgetDataContext = {
  dashboardContext: DashboardContext;
  comparisonContext?: DashboardContext;
  compareMode: boolean;
  viewMode: ComparisonViewMode;
  syncHover?: boolean;
  setWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  removeWidget?: (widgetId: string) => void;
};
