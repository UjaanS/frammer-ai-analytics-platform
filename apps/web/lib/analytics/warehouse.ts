export const warehouseDatasetIds = [
  "videos",
  "serviceRequests",
  "publishSchedules",
  "clipcutRequests",
  "trendingSnapshots",
  "lineage",
  "qualityIssues"
] as const;

export type WarehouseDatasetId = (typeof warehouseDatasetIds)[number];

export type WarehouseFilterState = {
  dateStart?: string;
  dateEnd?: string;
  company?: string;
  channel?: string;
  user?: string;
  language?: string;
  videoType?: string;
  serviceType?: string;
  sourcePlatform?: string;
  publishPlatform?: string;
  status?: string;
  includeDeleted?: boolean;
};

export type WarehouseMetricAggregation = "count" | "sum" | "avg" | "min" | "max" | "rate";

export type WarehouseMetricRequest = {
  id: string;
  aggregation: WarehouseMetricAggregation;
};

export type WarehouseQueryRequest = {
  dataset: WarehouseDatasetId;
  filters?: WarehouseFilterState;
  dimensionFilters?: Record<string, string>;
  search?: string;
  groupBy?: string[];
  metrics?: WarehouseMetricRequest[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  limit?: number;
};

export type WarehouseQueryResponse = {
  ok: boolean;
  data: {
    rows: Array<Record<string, unknown>>;
    groups: Array<Record<string, unknown>>;
  };
  meta: {
    source: "sql";
    dataset: WarehouseDatasetId;
    totalRows: number;
    filteredRows: number;
    asOf?: string;
  };
};

export type WarehouseCatalog = {
  datasets: Array<{
    id: WarehouseDatasetId;
    label: string;
    dimensions: string[];
    metrics: string[];
  }>;
  dimensions: string[];
  metricAggregations: WarehouseMetricAggregation[];
  filters: Record<string, string[]>;
};
