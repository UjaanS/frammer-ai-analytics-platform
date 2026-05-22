"use client";

import { useMemo } from "react";

import { applyAnalyticsFilters, buildMultiDimensionRows } from "@/lib/analytics/engine";
import type { FilterState, VideoRecord } from "@/lib/analytics/types";

export function useMultiDimensionalAnalytics(records: VideoRecord[], filters: FilterState) {
  return useMemo(() => {
    const filteredRecords = applyAnalyticsFilters(records, filters);
    const rows = buildMultiDimensionRows(
      filteredRecords,
      filters.dimension1,
      filters.dimension2,
      filters.metric
    );

    return {
      filteredRecords,
      rows,
      total: rows.reduce((sum, row) => sum + row.value, 0)
    };
  }, [records, filters]);
}
