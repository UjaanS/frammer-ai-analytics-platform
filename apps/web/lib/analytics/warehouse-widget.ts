"use client";

import useSWR from "swr";

import type { WarehouseQueryRequest, WarehouseQueryResponse } from "@/lib/analytics/warehouse";
import type { DashboardContext, WarehouseWidgetQuery } from "@/lib/widgets/types";

export function buildWarehouseRequest(
  query: WarehouseWidgetQuery,
  context?: DashboardContext
): WarehouseQueryRequest {
  return {
    dataset: query.dataset,
    filters: dashboardContextToWarehouseFilters(context),
    dimensionFilters: query.fixedDimensionFilters,
    groupBy: query.groupBy ?? [],
    metrics: query.metrics,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection ?? "desc",
    limit: query.limit ?? 500
  };
}

export function dashboardContextToWarehouseFilters(context?: DashboardContext) {
  const filters = context?.filters;
  const selected = (value?: string) => value && value !== "all" ? value : undefined;
  return {
    dateStart: context?.dateRange.start || undefined,
    dateEnd: context?.dateRange.end || undefined,
    company: selected(filters?.company),
    channel: selected(filters?.channel),
    user: selected(filters?.user),
    language: selected(filters?.language),
    videoType: selected(filters?.videoType),
    serviceType: selected(filters?.serviceType),
    sourcePlatform: selected(filters?.sourcePlatform),
    publishPlatform: selected(filters?.publishPlatform),
    status: selected(filters?.status),
    includeDeleted: filters?.includeDeleted ?? true
  };
}

export function useWarehouseWidgetData(query?: WarehouseWidgetQuery, context?: DashboardContext) {
  const request = query ? buildWarehouseRequest(query, context) : null;
  const key = request ? JSON.stringify({ url: "/api/analytics/warehouse/query", request }) : null;
  const { data, error, isLoading } = useSWR<WarehouseQueryResponse>(
    key,
    () => fetchWarehouseQuery("/api/analytics/warehouse/query", request as WarehouseQueryRequest),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 30_000
    }
  );
  return { data, error, isLoading, request };
}

export function investigationForMetric(metricId: string, context?: DashboardContext): WarehouseQueryRequest {
  if (metricId === "recordedQualityIssues") {
    return { dataset: "qualityIssues", filters: dashboardContextToWarehouseFilters(context), groupBy: ["issueCode"], metrics: [{ id: "recordCount", aggregation: "count" }], limit: 500 };
  }
  if (metricId === "publishThroughput" || metricId === "publishScheduleCompletionRate" || metricId === "publishPlatformHealth") {
    return { dataset: "publishSchedules", filters: dashboardContextToWarehouseFilters(context), groupBy: ["publishPlatform"], metrics: [{ id: "recordCount", aggregation: "count" }], limit: 500 };
  }
  if (metricId.startsWith("service") || metricId === "averageServiceLatency" || metricId === "stuckServiceJobs24h") {
    return { dataset: "serviceRequests", filters: dashboardContextToWarehouseFilters(context), groupBy: ["serviceType"], metrics: [{ id: "recordCount", aggregation: "count" }], limit: 500 };
  }
  return { dataset: "videos", filters: dashboardContextToWarehouseFilters(context), groupBy: ["channel"], metrics: [{ id: "recordCount", aggregation: "count" }], limit: 500 };
}

async function fetchWarehouseQuery(url: string, body: WarehouseQueryRequest): Promise<WarehouseQueryResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Warehouse query failed: ${response.status}`);
  return response.json() as Promise<WarehouseQueryResponse>;
}
