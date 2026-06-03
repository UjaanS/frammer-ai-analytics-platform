"use client";

import { Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { WarehouseExplorer } from "@/components/analytics/warehouse-explorer";
import { Button } from "@/components/ui/button";
import { WidgetChrome } from "@/components/widgets/widget-chrome";
import { SimpleDataTable, WhiteChartCanvas } from "@/components/widgets/widget-primitives";
import { buildWarehouseRequest, useWarehouseWidgetData } from "@/lib/analytics/warehouse-widget";
import type { WarehouseQueryRequest } from "@/lib/analytics/warehouse";
import { platformPalette } from "@/lib/widgets/dashboard-data";
import { useWidgetData } from "@/lib/widgets/use-widget-data";
import type { WidgetDataContext, WidgetSchema } from "@/lib/widgets/types";

type Props = { widget: WidgetSchema; context: WidgetDataContext };

export function WarehouseChartWidget({ widget, context, variant }: Props & { variant: "line" | "bar" | "pie" }) {
  const query = widget.config.warehouseQuery;
  const { data } = useWarehouseWidgetData(query, context.dashboardContext);
  const { data: comparison } = useWarehouseWidgetData(query, context.comparisonContext);
  const groups = data?.data.groups ?? [];
  const comparisonGroups = context.comparisonContext ? comparison?.data.groups ?? [] : [];
  const dimension = query?.groupBy?.[0] ?? "date";
  const metric = query?.metrics[0]?.id ?? "recordCount";
  const overlay = context.viewMode === "overlay" && comparisonGroups.length
    ? mergeGroups(groups, comparisonGroups, dimension, metric)
    : groups;
  const primaryKey = context.viewMode === "overlay" && comparisonGroups.length ? `${metric}A` : metric;
  const open = (row?: Record<string, unknown>) => openInvestigation(context, query, row && dimension ? { [dimension]: String(row[dimension] ?? "") } : undefined);

  return (
    <WidgetChrome
      title={widget.title}
      description={widget.config.description}
      exportRows={groups.map(toExportRow)}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
      actions={<InvestigateButton onClick={() => open()} />}
    >
      <WhiteChartCanvas>
        <ResponsiveContainer width="100%" height="100%">
          {variant === "line" ? (
            <LineChart data={overlay} onClick={(state) => open(activeRow(state))}>
              <CartesianGrid stroke="#e8e8ee" />
              <XAxis dataKey={dimension} tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={primaryKey} name={context.dashboardContext.label} stroke="hsl(var(--chart-1))" strokeWidth={3} />
              {context.viewMode === "overlay" && comparisonGroups.length ? <Line type="monotone" dataKey={`${metric}B`} name={context.comparisonContext?.label ?? "Context B"} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" strokeWidth={2} /> : null}
            </LineChart>
          ) : variant === "pie" ? (
            <PieChart>
              <Pie data={groups} dataKey={metric} nameKey={dimension} innerRadius={52} outerRadius={94} onClick={(row) => open(row as Record<string, unknown>)}>
                {groups.map((row, index) => <Cell key={`${String(row[dimension])}-${index}`} fill={platformPalette[index % platformPalette.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={overlay} layout="vertical" onClick={(state) => open(activeRow(state))}>
              <CartesianGrid stroke="#e8e8ee" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
              <YAxis dataKey={dimension} type="category" tick={{ fill: "#374151", fontSize: 12 }} tickLine={false} width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey={primaryKey} name={context.dashboardContext.label} fill="hsl(var(--chart-1))" radius={[0, 8, 8, 0]} />
              {context.viewMode === "overlay" && comparisonGroups.length ? <Bar dataKey={`${metric}B`} name={context.comparisonContext?.label ?? "Context B"} fill="hsl(var(--chart-3))" radius={[0, 8, 8, 0]} /> : null}
            </BarChart>
          )}
        </ResponsiveContainer>
      </WhiteChartCanvas>
    </WidgetChrome>
  );
}

export function WarehouseTableWidget({ widget, context }: Props) {
  const query = widget.config.warehouseQuery;
  const { data } = useWarehouseWidgetData(query, context.dashboardContext);
  const groups = data?.data.groups ?? [];
  const columns = visibleColumns(groups);
  return (
    <WidgetChrome
      title={widget.title}
      description={widget.config.description}
      exportRows={groups.map(toExportRow)}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
      actions={<InvestigateButton onClick={() => openInvestigation(context, query)} />}
    >
      <SimpleDataTable columns={columns} rows={groups.map((row) => columns.map((column) => String(row[column] ?? "")))} />
    </WidgetChrome>
  );
}

export function FunnelChartWidget({ widget, context }: Props) {
  const query = widget.config.warehouseQuery;
  const { data } = useWarehouseWidgetData(query, context.dashboardContext);
  const { data: summary } = useWidgetData<Record<string, number>>(widget.config.funnelStages ? "summary" : null, {}, context.dashboardContext);
  const rows = widget.config.funnelStages
    ? widget.config.funnelStages.map((stage) => ({ label: stage.label, value: summary?.[stage.metricId] ?? 0 }))
    : (data?.data.groups ?? []).map((row) => ({
        label: String(row[query?.groupBy?.[0] ?? "status"] ?? "Unknown"),
        value: Number(row[query?.metrics[0]?.id ?? "recordCount"] ?? 0)
      })).filter((row) => !widget.config.funnelInclude || widget.config.funnelInclude.includes(row.label))
        .sort((a, b) => widget.config.funnelInclude
          ? widget.config.funnelInclude.indexOf(a.label) - widget.config.funnelInclude.indexOf(b.label)
          : b.value - a.value);
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <WidgetChrome
      title={widget.title}
      description={widget.config.description}
      exportRows={rows}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
      actions={<InvestigateButton onClick={() => openInvestigation(context, query)} />}
    >
      <div className="flex h-full flex-col justify-center gap-3 overflow-auto">
        {rows.map((row, index) => (
          <button
            type="button"
            key={`${row.label}-${index}`}
            className="grid gap-1 text-left"
            onClick={() => openInvestigation(context, query, query?.groupBy?.[0] ? { [query.groupBy[0]]: row.label } : undefined)}
          >
            <span className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300"><span>{row.label}</span><span>{row.value.toLocaleString()}</span></span>
            <span className="h-8 rounded-md bg-slate-100 dark:bg-white/[0.05]"><span className="block h-full rounded-md bg-[#ef405b]" style={{ width: `${Math.max(3, row.value / max * 100)}%` }} /></span>
          </button>
        ))}
      </div>
    </WidgetChrome>
  );
}

export function WarehouseExplorerWidget({ widget, context }: Props) {
  const query = widget.config.warehouseQuery;
  const initialQuery = query ? buildWarehouseRequest(query, context.dashboardContext) : undefined;
  return (
    <WidgetChrome
      title={widget.title}
      description={widget.config.description}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
    >
      <div className="h-full overflow-auto">
        <WarehouseExplorer key={JSON.stringify(initialQuery)} initialQuery={initialQuery} mode="compact" />
      </div>
    </WidgetChrome>
  );
}

function InvestigateButton({ onClick }: { onClick: () => void }) {
  return <Button type="button" variant="outline" size="sm" onClick={onClick}><Search className="mr-2 h-4 w-4" />Investigate</Button>;
}

function openInvestigation(context: WidgetDataContext, query?: WidgetSchema["config"]["warehouseQuery"], dimensionFilters?: Record<string, string>) {
  if (!query) return;
  const request = buildWarehouseRequest(query, context.dashboardContext);
  context.openInvestigation?.({
    ...request,
    dimensionFilters: { ...request.dimensionFilters, ...dimensionFilters }
  });
}

function mergeGroups(current: Array<Record<string, unknown>>, comparison: Array<Record<string, unknown>>, dimension: string, metric: string) {
  const rows = new Map<string, Record<string, unknown>>();
  current.forEach((row) => rows.set(String(row[dimension]), { [dimension]: row[dimension], [`${metric}A`]: row[metric] }));
  comparison.forEach((row) => rows.set(String(row[dimension]), { ...rows.get(String(row[dimension])), [dimension]: row[dimension], [`${metric}B`]: row[metric] }));
  return Array.from(rows.values());
}

function activeRow(state: unknown): Record<string, unknown> | undefined {
  return (state as { activePayload?: Array<{ payload?: Record<string, unknown> }> } | undefined)?.activePayload?.[0]?.payload;
}

function visibleColumns(rows: Array<Record<string, unknown>>) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8);
}

function toExportRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "object" ? JSON.stringify(value) : String(value ?? "")]));
}
