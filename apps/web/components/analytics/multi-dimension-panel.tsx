"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { DataTable } from "@/components/data-table/data-table";
import { FilterSelect } from "@/components/filters/filter-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { useMultiDimensionalAnalytics } from "@/hooks/use-multi-dimensional-analytics";
import { dimensionLabels, metricLabels } from "@/lib/analytics/engine";
import { dimensionOptions, metricOptions, videoRecords } from "@/lib/analytics/mock-data";
import type { DimensionKey, MetricKey } from "@/lib/analytics/types";

type DimensionTableRow = {
  dimension1: string;
  dimension2: string;
  value: number;
  count: number;
};

const columns: ColumnDef<DimensionTableRow>[] = [
  { accessorKey: "dimension1", header: "Dimension 1" },
  { accessorKey: "dimension2", header: "Dimension 2" },
  {
    accessorKey: "value",
    header: "Metric",
    cell: ({ row }) => row.original.value.toLocaleString()
  },
  { accessorKey: "count", header: "Records" }
];

export function MultiDimensionPanel() {
  const { filters, setFilter } = useAnalyticsFilters();
  const { rows, total } = useMultiDimensionalAnalytics(videoRecords, filters);
  const chartRows = rows.slice(0, 8).map((row) => ({
    name: `${row.dimension1} / ${row.dimension2}`,
    value: row.value
  }));

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Multi-Dimensional Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pivot any two dimensions against a selected metric. Current total: {total.toLocaleString()}.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <FilterSelect
            label="Dimension 1"
            value={filters.dimension1}
            options={dimensionOptions.map((option) => ({ value: option.key, label: option.label }))}
            onChange={(value) => setFilter("dimension1", value as DimensionKey)}
          />
          <FilterSelect
            label="Dimension 2"
            value={filters.dimension2}
            options={dimensionOptions.map((option) => ({ value: option.key, label: option.label }))}
            onChange={(value) => setFilter("dimension2", value as DimensionKey)}
          />
          <FilterSelect
            label="Metric"
            value={filters.metric}
            options={metricOptions.map((option) => ({ value: option.key, label: option.label }))}
            onChange={(value) => setFilter("metric", value as MetricKey)}
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)]">
        <div className="rounded-lg bg-muted/30 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">
              {metricLabels[filters.metric]} by {dimensionLabels[filters.dimension1]} x{" "}
              {dimensionLabels[filters.dimension2]}
            </h3>
            <p className="text-sm text-muted-foreground">Top combinations adapt to the selected dimensions.</p>
          </div>
          <HorizontalBarChart data={chartRows} />
        </div>
        <div className="min-w-0">
          <DataTable columns={columns} data={rows.slice(0, 12)} />
        </div>
      </CardContent>
    </Card>
  );
}
