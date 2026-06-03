"use client";

import { Download, ExternalLink, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { FilterSelect } from "@/components/filters/filter-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsWidgetExpanded } from "@/components/widgets/widget-chrome";
import { serializeExplorerQuery } from "@/lib/analytics/explorer-state";
import type {
  WarehouseCatalog,
  WarehouseDatasetId,
  WarehouseFilterState,
  WarehouseMetricAggregation,
  WarehouseQueryRequest,
  WarehouseQueryResponse
} from "@/lib/analytics/warehouse";

const emptyFilters: WarehouseFilterState = { includeDeleted: true };
const filterDefinitions: Array<{ key: keyof WarehouseFilterState; label: string; catalogKey: string }> = [
  { key: "company", label: "Company", catalogKey: "companies" },
  { key: "channel", label: "Channel", catalogKey: "channels" },
  { key: "user", label: "User", catalogKey: "users" },
  { key: "language", label: "Language", catalogKey: "languages" },
  { key: "videoType", label: "Video Type", catalogKey: "videoTypes" },
  { key: "serviceType", label: "Service Type", catalogKey: "serviceTypes" },
  { key: "sourcePlatform", label: "Source Platform", catalogKey: "sourcePlatforms" },
  { key: "publishPlatform", label: "Publish Platform", catalogKey: "publishPlatforms" },
  { key: "status", label: "Status", catalogKey: "statuses" }
];

export function WarehouseExplorer({
  initialQuery,
  mode = "full-page"
}: {
  initialQuery?: WarehouseQueryRequest;
  mode?: "compact" | "overlay" | "full-page";
}) {
  const router = useRouter();
  const isWidgetExpanded = useIsWidgetExpanded();
  const effectiveMode = mode === "compact" && isWidgetExpanded ? "overlay" : mode;
  const showAdvanced = effectiveMode !== "compact";
  const { data: catalogResponse } = useSWR<{ ok: boolean; data: WarehouseCatalog }>(
    "/api/analytics/warehouse/catalog",
    fetchJson
  );
  const catalog = catalogResponse?.data;
  const [dataset, setDataset] = useState<WarehouseDatasetId>(initialQuery?.dataset ?? "videos");
  const [filters, setFilters] = useState<WarehouseFilterState>(initialQuery?.filters ?? emptyFilters);
  const [dimensionFilters, setDimensionFilters] = useState<Record<string, string>>(initialQuery?.dimensionFilters ?? {});
  const [search, setSearch] = useState(initialQuery?.search ?? "");
  const [groupBy, setGroupBy] = useState<string>(initialQuery?.groupBy?.[0] ?? "company");
  const [secondGroupBy, setSecondGroupBy] = useState<string>(initialQuery?.groupBy?.[1] ?? "none");
  const [metric, setMetric] = useState(initialQuery?.metrics?.[0]?.id ?? "recordCount");
  const [aggregation, setAggregation] = useState<WarehouseMetricAggregation>(initialQuery?.metrics?.[0]?.aggregation ?? "count");
  const [selectedGroup, setSelectedGroup] = useState<Record<string, unknown> | null>(null);
  const [page, setPage] = useState(0);

  const datasetDefinition = catalog?.datasets.find((item) => item.id === dataset);
  const query = useMemo<WarehouseQueryRequest>(
    () => ({
      dataset,
      filters,
      dimensionFilters,
      search: search || undefined,
      groupBy: [groupBy, secondGroupBy].filter((value) => value !== "none"),
      metrics: [{ id: metric, aggregation }],
      sortBy: metric,
      sortDirection: "desc",
      limit: 10000
    }),
    [aggregation, dataset, dimensionFilters, filters, groupBy, metric, search, secondGroupBy]
  );
  const { data, error, isLoading } = useSWR<WarehouseQueryResponse>(
    catalog ? ["/api/analytics/warehouse/query", query] : null,
    ([url, request]: [string, WarehouseQueryRequest]) => fetchJson(url, request)
  );
  const detailQuery = useMemo<WarehouseQueryRequest>(
    () => ({
      dataset,
      filters,
      dimensionFilters: selectedGroup
        ? {
            ...dimensionFilters,
            ...Object.fromEntries(
            [groupBy, secondGroupBy]
              .filter((value) => value !== "none")
              .map((dimension) => [dimension, String(selectedGroup[dimension] ?? "")])
              .filter(([, value]) => value)
          )
          }
        : dimensionFilters,
      search: search || undefined,
      metrics: [{ id: "recordCount", aggregation: "count" }],
      sortBy: "date",
      sortDirection: "desc",
      limit: 10000
    }),
    [dataset, dimensionFilters, filters, groupBy, search, secondGroupBy, selectedGroup]
  );
  const { data: detailData } = useSWR<WarehouseQueryResponse>(
    selectedGroup ? ["/api/analytics/warehouse/query", detailQuery] : null,
    ([url, request]: [string, WarehouseQueryRequest]) => fetchJson(url, request)
  );

  const rows = data?.data.rows ?? [];
  const groups = data?.data.groups ?? [];
  const detailRows = selectedGroup ? detailData?.data.rows ?? [] : rows;
  const rowColumns = visibleColumns(detailRows);
  const groupColumns = visibleColumns(groups);
  const pageSize = effectiveMode === "compact" ? 25 : 50;
  const totalPages = Math.max(1, Math.ceil(detailRows.length / pageSize));
  const pagedRows = detailRows.slice(page * pageSize, (page + 1) * pageSize);
  const pageResetKey = JSON.stringify({ dataset, filters, dimensionFilters, search, groupBy, secondGroupBy, metric, aggregation, selectedGroup });

  useEffect(() => {
    setPage(0);
  }, [pageResetKey]);

  function updateDataset(value: string) {
    const nextDataset = value as WarehouseDatasetId;
    const definition = catalog?.datasets.find((item) => item.id === nextDataset);
    setDataset(nextDataset);
    setDimensionFilters({});
    setGroupBy(definition?.dimensions[0] ?? "none");
    setSecondGroupBy("none");
    setMetric("recordCount");
    setAggregation("count");
    setSelectedGroup(null);
  }

  function updateMetric(value: string) {
    setMetric(value);
    setAggregation(value === "recordCount" ? "count" : value.endsWith("Rate") ? "rate" : "sum");
  }

  function exportCsv() {
    const csvRows = detailRows.map((row) => rowColumns.map((column) => JSON.stringify(row[column] ?? "")).join(","));
    const csv = [rowColumns.join(","), ...csvRows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `frammer-${dataset}-explorer.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function openFullExplorer() {
    router.push(`/video-explorer?${serializeExplorerQuery({ ...query, limit: 10000 })}`);
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Universal Warehouse Query</CardTitle>
          <p className="text-sm text-muted-foreground">
            Query imported marts directly. No filter is applied until you select one.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {showAdvanced ? <FilterSelect
              label="Dataset"
              value={dataset}
              options={(catalog?.datasets ?? []).map((item) => ({ value: item.id, label: item.label }))}
              onChange={updateDataset}
            /> : null}
            {showAdvanced ? (
              <>
                <FilterSelect
                  label="Group By"
                  value={groupBy}
                  options={options(datasetDefinition?.dimensions ?? [], false)}
                  onChange={(value) => {
                    setGroupBy(value);
                    setSelectedGroup(null);
                  }}
                />
                <FilterSelect
                  label="Second Group"
                  value={secondGroupBy}
                  options={options(datasetDefinition?.dimensions ?? [], true)}
                  onChange={(value) => {
                    setSecondGroupBy(value);
                    setSelectedGroup(null);
                  }}
                />
              </>
            ) : null}
            {showAdvanced ? <FilterSelect label="Metric" value={metric} options={options(datasetDefinition?.metrics ?? [], false)} onChange={updateMetric} /> : null}
            {showAdvanced ? <FilterSelect
              label="Aggregation"
              value={aggregation}
              options={(catalog?.metricAggregations ?? []).map((value) => ({ value, label: value.toUpperCase() }))}
              onChange={(value) => setAggregation(value as WarehouseMetricAggregation)}
            /> : null}
            <label className="grid gap-1 text-xs font-medium text-muted-foreground xl:col-span-3">
              Search indexed fields
              <span className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ids, names, titles, statuses, platforms..."
                  className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground"
                />
              </span>
            </label>
          </div>
          {showAdvanced ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Date start
              <input className="h-9 rounded-md border bg-background px-3 text-sm" type="date" value={filters.dateStart ?? ""} onChange={(event) => setFilters({ ...filters, dateStart: event.target.value || undefined })} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Date end
              <input className="h-9 rounded-md border bg-background px-3 text-sm" type="date" value={filters.dateEnd ?? ""} onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value || undefined })} />
            </label>
            {filterDefinitions.map((filter) => (
              <FilterSelect
                key={filter.key}
                label={filter.label}
                value={String(filters[filter.key] ?? "all")}
                options={options(filterValues(catalog, filter.catalogKey), true, "all")}
                onChange={(value) => setFilters({ ...filters, [filter.key]: value === "all" ? undefined : value })}
              />
            ))}
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={filters.includeDeleted !== false} onChange={(event) => setFilters({ ...filters, includeDeleted: event.target.checked })} />
              Include deleted rows
            </label>
          </div> : null}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{isLoading ? "Loading warehouse..." : `${data?.meta.filteredRows ?? 0} of ${data?.meta.totalRows ?? 0} rows`}</span>
            <Button variant="outline" size="sm" onClick={() => {
              setFilters(emptyFilters);
              setDimensionFilters({});
            }}>Clear filters</Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!detailRows.length}>
              <Download className="mr-2 h-4 w-4" />
              Export rows
            </Button>
            {effectiveMode !== "full-page" ? (
              <Button variant="outline" size="sm" onClick={openFullExplorer}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Full Explorer
              </Button>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">Warehouse query failed: {String(error)}</p> : null}
        </CardContent>
      </Card>

      {showAdvanced ? <WarehouseTable
        title="Grouped Aggregation"
        rows={groups}
        columns={groupColumns}
        onRowClick={(row) => setSelectedGroup(row)}
      /> : null}
      <WarehouseTable
        title={selectedGroup ? "Drilldown Rows" : "Warehouse Rows"}
        rows={pagedRows}
        columns={rowColumns}
        pagination={{
          page,
          totalPages,
          totalRows: detailRows.length,
          pageSize,
          onPageChange: setPage
        }}
      />
    </div>
  );
}

function WarehouseTable({
  title,
  rows,
  columns,
  onRowClick,
  pagination
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
  onRowClick?: (row: Record<string, unknown>) => void;
  pagination?: {
    page: number;
    totalPages: number;
    totalRows: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>{columns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.id ?? "group"}-${index}`} className={onRowClick ? "cursor-pointer" : undefined} onClick={() => onRowClick?.(row)}>
                {columns.map((column) => <TableCell key={column} className="max-w-[24rem] truncate">{formatValue(row[column])}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">No matching warehouse rows.</p> : null}
        {pagination && pagination.totalRows ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Showing {pagination.page * pagination.pageSize + 1}-{Math.min((pagination.page + 1) * pagination.pageSize, pagination.totalRows)} of {pagination.totalRows}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page === 0} onClick={() => pagination.onPageChange(pagination.page - 1)}>
                Previous
              </Button>
              <span>Page {pagination.page + 1} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={pagination.page + 1 >= pagination.totalPages} onClick={() => pagination.onPageChange(pagination.page + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function filterValues(catalog: WarehouseCatalog | undefined, key: string) {
  if (key === "statuses") {
    return Array.from(new Set([...(catalog?.filters.videoStatuses ?? []), ...(catalog?.filters.serviceStatuses ?? [])])).sort();
  }
  return catalog?.filters[key] ?? [];
}

function options(values: string[], includeNone: boolean, noneValue = "none") {
  const mapped = values.map((value) => ({ value, label: humanize(value) }));
  return includeNone ? [{ value: noneValue, label: noneValue === "all" ? "All" : "None" }, ...mapped] : mapped;
}

function visibleColumns(rows: Array<Record<string, unknown>>) {
  const preferred = ["id", "date", "company", "channel", "user", "language", "videoType", "serviceType", "sourcePlatform", "publishPlatform", "status", "recordCount"];
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((key) => key !== "searchText");
  return [...preferred.filter((key) => keys.includes(key)), ...keys.filter((key) => !preferred.includes(key))].slice(0, 14);
}

function formatValue(value: unknown) {
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value ?? "");
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

async function fetchJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  } : undefined);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
