"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { FilterChips } from "@/components/filters/filter-chips";
import { FilterSelect } from "@/components/filters/filter-select";
import { Button } from "@/components/ui/button";
import {
  billableStatuses,
  channels,
  companies,
  dimensionOptions,
  inputTypes,
  languages,
  metricOptions,
  outputTypes,
  platforms,
  publishedStatuses,
  qualityFlags,
  users
} from "@/lib/analytics/mock-data";
import { comparisonRangeOptions, dateRangeOptions } from "@/lib/analytics/filters";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import type { DimensionKey, MetricKey } from "@/lib/analytics/types";

export function GlobalFilterBar() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { filters, setFilter, resetFilters, isPending } = useAnalyticsFilters();

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:-mx-6 lg:px-6">
      <div className="mx-auto max-w-[1440px] space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <FilterSelect
            label="Date Range"
            value={filters.dateRange}
            options={dateRangeOptions}
            onChange={(value) => setFilter("dateRange", value)}
          />
          <FilterSelect
            label="Comparison"
            value={filters.comparisonRange}
            options={comparisonRangeOptions}
            onChange={(value) => setFilter("comparisonRange", value)}
          />
          <FilterSelect
            label="Company"
            value={filters.company}
            options={[{ value: "all", label: "All companies" }, ...companies.map((value) => ({ value, label: value }))]}
            onChange={(value) => setFilter("company", value)}
          />
          <FilterSelect
            label="Channel"
            value={filters.channel}
            options={[{ value: "all", label: "All channels" }, ...channels.map((value) => ({ value, label: value }))]}
            onChange={(value) => setFilter("channel", value)}
          />
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button type="button" variant="ghost" className="h-9" onClick={resetFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {showAdvanced ? (
          <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Users"
              value={filters.users[0] ?? "all"}
              options={[{ value: "all", label: "All users" }, ...users.map((value) => ({ value, label: value }))]}
              onChange={(value) => setFilter("users", value === "all" ? [] : [value])}
            />
            <FilterSelect
              label="Language"
              value={filters.language}
              options={[{ value: "all", label: "All languages" }, ...languages.map((value) => ({ value, label: value }))]}
              onChange={(value) => setFilter("language", value)}
            />
            <FilterSelect
              label="Platform"
              value={filters.platform}
              options={[{ value: "all", label: "All platforms" }, ...platforms.map((value) => ({ value, label: value }))]}
              onChange={(value) => setFilter("platform", value)}
            />
            <FilterSelect
              label="Published Status"
              value={filters.publishedStatus}
              options={[{ value: "all", label: "All statuses" }, ...publishedStatuses.map((value) => ({ value, label: value }))]}
              onChange={(value) => setFilter("publishedStatus", value)}
            />
            <FilterSelect
              label="Input Type"
              value={filters.inputType}
              options={[{ value: "all", label: "All input types" }, ...inputTypes.map((value) => ({ value, label: value }))]}
              onChange={(value) => setFilter("inputType", value)}
            />
            <FilterSelect
              label="Output Type"
              value={filters.outputType}
              options={[{ value: "all", label: "All output types" }, ...outputTypes.map((value) => ({ value, label: value }))]}
              onChange={(value) => setFilter("outputType", value)}
            />
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
            <FilterSelect
              label="Billable Status"
              value={filters.billableStatus}
              options={[{ value: "all", label: "All billing states" }, ...billableStatuses.map((value) => ({ value, label: value }))]}
              onChange={(value) => setFilter("billableStatus", value)}
            />
            <FilterSelect
              label="Data Quality Flags"
              value={filters.dataQualityFlags[0] ?? "all"}
              options={[{ value: "all", label: "All flags" }, ...qualityFlags.map((value) => ({ value, label: value }))]}
              onChange={(value) => setFilter("dataQualityFlags", value === "all" ? [] : [value])}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <FilterChips filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
          {isPending ? <span className="text-xs text-muted-foreground">Updating filters...</span> : null}
        </div>
      </div>
    </div>
  );
}
