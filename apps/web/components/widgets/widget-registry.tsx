"use client";

import { Download, FileDown, Search, Sparkles, X } from "lucide-react";
import { useState } from "react";
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

import { Button } from "@/components/ui/button";
import { ModeToggle, TimeGroupToggle } from "@/components/widgets/widget-controls";
import { WidgetChrome } from "@/components/widgets/widget-chrome";
import { SimpleDataTable, WhiteChartCanvas } from "@/components/widgets/widget-primitives";
import {
  calculateDelta,
  chartColors,
  formatMetricValue,
  formatMinutes,
  getWidgetData,
  platformKeys,
  platformPalette,
  timeGroupLabel
} from "@/lib/widgets/dashboard-data";
import { cn } from "@/lib/utils";
import { ENABLE_NEW_GRID_SYSTEM } from "@/src/modules/analytics/layout";
import type { WidgetDataContext, WidgetSchema } from "@/lib/widgets/types";
import type { VideoRecord } from "@/lib/analytics/types";

type WidgetComponentProps = {
  widget: WidgetSchema;
  context: WidgetDataContext;
};

export const widgetRegistry = {
  kpi: KpiWidget,
  "line-chart": LineChartWidget,
  "bar-chart": BarChartWidget,
  "pie-chart": PieChartWidget,
  table: TableWidget,
  heatmap: HeatmapWidget,
  "ai-insight": AiInsightWidget
} satisfies Record<WidgetSchema["type"], (props: WidgetComponentProps) => JSX.Element>;

export function WidgetRenderer({ widget, context }: WidgetComponentProps) {
  const Component = widgetRegistry[widget.type];
  return <Component widget={widget} context={context} />;
}

function KpiWidget({ widget, context }: WidgetComponentProps) {
  const [open, setOpen] = useState(false);
  const data = getWidgetData(widget.queryKey, widget.config, context.dashboardContext) as Record<string, number>;
  const comparisonData = context.comparisonContext
    ? (getWidgetData(widget.queryKey, widget.config, context.comparisonContext) as Record<string, number>)
    : undefined;
  const metric = widget.config.metric ?? "uploaded";
  const rawValue = data[metric] ?? 0;
  const comparisonValue = comparisonData?.[metric];
  const delta = comparisonValue === undefined ? null : calculateDelta(rawValue, comparisonValue);
  const value = metric.includes("Duration") || metric === "avgProcessing" ? formatMinutes(rawValue) : metric === "publishRate" ? `${rawValue}%` : Math.round(rawValue).toLocaleString();
  const detail = getKpiDetail(metric, data);
  const trendData = getWidgetData("timeTrend", { ...widget.config, timeGroup: "day" }, context.dashboardContext) as Array<Record<string, string | number>>;
  const trendKey = getTrendKey(metric);

  return (
    <>
      <section
        className={cn(
          "widget-drag-handle group relative h-full cursor-move overflow-hidden rounded-lg border border-white/10 bg-[#24283d] shadow-lg shadow-black/20 transition hover:border-white/20",
          ENABLE_NEW_GRID_SYSTEM ? "p-4" : "p-5"
        )}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setOpen(true);
        }}
      >
        {context.removeWidget ? (
          <button
            type="button"
            title="Remove widget"
            aria-label="Remove widget"
            className="widget-interactive absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 opacity-0 transition hover:bg-rose-500/15 hover:text-rose-100 group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              context.removeWidget?.(widget.id);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <h3 className={cn("font-bold text-slate-400", ENABLE_NEW_GRID_SYSTEM ? "text-base" : "text-lg")}>{widget.title}</h3>
        <div className={cn("font-black text-white", ENABLE_NEW_GRID_SYSTEM ? "mt-3 text-2xl" : "mt-5 text-3xl")}>{value}</div>
        <p className="mt-2 text-sm font-semibold text-slate-300">{detail}</p>
        {delta ? (
          <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${delta.direction === "down" ? "bg-rose-500/15 text-rose-200" : "bg-emerald-500/15 text-emerald-200"}`}>
            {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→"} {delta.delta > 0 ? "+" : ""}
            {formatDeltaValue(delta.delta, metric)} · {delta.percent > 0 ? "+" : ""}
            {delta.percent}% vs peer
          </div>
        ) : null}
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="widget-interactive w-full max-w-3xl rounded-lg border border-white/10 bg-[#24283d] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-[#ef405b]">Metric breakdown</div>
                <h2 className="mt-1 text-2xl font-black text-white">{widget.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{context.dashboardContext.label} · {detail}</p>
              </div>
              <button type="button" className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-lg border border-white/10 bg-[#2d3147] p-4">
                <div className="text-sm font-bold text-slate-400">Current value</div>
                <div className="mt-3 text-4xl font-black text-white">{value}</div>
                <p className="mt-2 text-sm font-semibold text-slate-300">{detail}</p>
                {delta ? (
                  <div className="mt-4 rounded-lg bg-white/[0.04] p-3 text-sm font-bold text-slate-200">
                    {delta.percent > 0 ? "+" : ""}{delta.percent}% vs comparison context
                  </div>
                ) : null}
              </div>
              <WhiteChartCanvas>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ left: 8, right: 16, top: 12, bottom: 8 }}>
                    <CartesianGrid stroke="#e8e8ee" />
                    <XAxis dataKey="label" tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
                    <Tooltip formatter={(item) => formatMetricValue(Number(item), trendKey.includes("Duration") ? "duration" : "count")} />
                    <Line type="monotone" dataKey={trendKey} name={widget.title} stroke={chartColors.published} strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </WhiteChartCanvas>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LineChartWidget({ widget, context }: WidgetComponentProps) {
  const mode = widget.config.metricMode ?? "count";
  const timeGroup = widget.config.timeGroup ?? "day";
  const data = getWidgetData(widget.queryKey, widget.config, context.dashboardContext) as Array<Record<string, string | number>>;
  const comparisonData = context.comparisonContext
    ? (getWidgetData(widget.queryKey, widget.config, context.comparisonContext) as Array<Record<string, string | number>>)
    : [];
  const overlayData = context.viewMode === "overlay" && comparisonData.length ? mergeTimeSeries(data, comparisonData) : data;
  const currentSuffix = context.viewMode === "overlay" && comparisonData.length ? "A" : "";

  return (
    <WidgetChrome
      title={widget.title}
      description={widget.config.description}
      exportRows={data.map((row) => ({ ...row, context: context.dashboardContext.label }))}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
      actions={
        <div className="flex flex-wrap gap-3">
          <TimeGroupToggle value={timeGroup} onChange={(value) => context.setWidgetConfig(widget.id, { timeGroup: value })} />
          <ModeToggle value={mode} onChange={(value) => context.setWidgetConfig(widget.id, { metricMode: value })} />
        </div>
      }
    >
      <WhiteChartCanvas>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart syncId={getChartSyncId(widget, context)} data={overlayData} margin={{ left: 12, right: 28, top: 16, bottom: 8 }}>
            <CartesianGrid stroke="#e8e8ee" />
            <XAxis dataKey="label" tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
            <YAxis tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
            <Tooltip formatter={(value) => formatMetricValue(Number(value), mode)} />
            <Legend />
            <Line type="monotone" dataKey={`${mode === "count" ? "uploaded" : "uploadedDuration"}${currentSuffix}`} name={`${context.dashboardContext.label} Uploaded`} stroke={chartColors.uploaded} strokeWidth={3} />
            <Line type="monotone" dataKey={`${mode === "count" ? "processed" : "processedDuration"}${currentSuffix}`} name={`${context.dashboardContext.label} Processed`} stroke={chartColors.processed} strokeWidth={3} />
            <Line type="monotone" dataKey={`${mode === "count" ? "published" : "publishedDuration"}${currentSuffix}`} name={`${context.dashboardContext.label} Published`} stroke={chartColors.published} strokeWidth={3} />
            {context.viewMode === "overlay" && comparisonData.length ? (
              <>
                <Line type="monotone" dataKey={mode === "count" ? "uploadedB" : "uploadedDurationB"} name={`${context.comparisonContext?.label ?? "Context B"} Uploaded`} stroke={chartColors.uploaded} strokeDasharray="5 5" strokeWidth={2} />
                <Line type="monotone" dataKey={mode === "count" ? "processedB" : "processedDurationB"} name={`${context.comparisonContext?.label ?? "Context B"} Processed`} stroke={chartColors.processed} strokeDasharray="5 5" strokeWidth={2} />
                <Line type="monotone" dataKey={mode === "count" ? "publishedB" : "publishedDurationB"} name={`${context.comparisonContext?.label ?? "Context B"} Published`} stroke={chartColors.published} strokeDasharray="5 5" strokeWidth={2} />
              </>
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </WhiteChartCanvas>
    </WidgetChrome>
  );
}

function BarChartWidget({ widget, context }: WidgetComponentProps) {
  const mode = widget.config.metricMode ?? "count";
  const data = getWidgetData(widget.queryKey, widget.config, context.dashboardContext) as Array<Record<string, string | number>>;
  const comparisonData = context.comparisonContext
    ? (getWidgetData(widget.queryKey, widget.config, context.comparisonContext) as Array<Record<string, string | number>>)
    : [];
  const isPlatform = widget.queryKey === "platformDistribution";
  const overlayData = context.viewMode === "overlay" && comparisonData.length ? mergeCategorySeries(data, comparisonData) : data;
  const platformData = context.viewMode === "overlay" && comparisonData.length ? mergePlatformSeries(data, comparisonData) : data;

  return (
    <WidgetChrome
      title={widget.title}
      description={widget.config.description}
      exportRows={data.map((row) => ({ ...row, context: context.dashboardContext.label }))}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
      actions={<ModeToggle value={mode} onChange={(value) => context.setWidgetConfig(widget.id, { metricMode: value })} />}
    >
      <WhiteChartCanvas>
        <ResponsiveContainer width="100%" height="100%">
          {isPlatform ? (
            <BarChart syncId={getChartSyncId(widget, context)} data={platformData} margin={{ left: 12, right: 28, top: 16, bottom: 8 }}>
              <CartesianGrid stroke="#e8e8ee" />
              <XAxis dataKey="channel" tick={{ fill: "#374151", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
              <Tooltip formatter={(value) => formatMetricValue(Number(value), mode)} />
              <Legend />
              {platformKeys.map((platform, index) => {
                const baseKey = `${platform}-${mode}`;
                const dataKeys =
                  context.viewMode === "overlay" && comparisonData.length
                    ? [
                        { key: `${baseKey}A`, name: `${context.dashboardContext.label} ${platform}`, stackId: "context-a" },
                        { key: `${baseKey}B`, name: `${context.comparisonContext?.label ?? "Context B"} ${platform}`, stackId: "context-b" }
                      ]
                    : [{ key: baseKey, name: platform, stackId: "platform" }];

                return dataKeys.map((item) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    name={item.name}
                    stackId={item.stackId}
                    fill={platformPalette[index]}
                    fillOpacity={item.key.endsWith("B") ? 0.55 : 1}
                    radius={index === platformKeys.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                  />
                ));
              })}
            </BarChart>
          ) : (
            <BarChart syncId={getChartSyncId(widget, context)} data={overlayData} layout="vertical" margin={{ left: 42, right: 28, top: 16, bottom: 8 }}>
              <CartesianGrid stroke="#e8e8ee" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} />
              <YAxis dataKey="channel" type="category" tick={{ fill: "#374151", fontSize: 12 }} tickLine={false} width={110} />
              <Tooltip formatter={(value) => formatMetricValue(Number(value), mode)} />
              <Legend />
              <Bar dataKey={context.viewMode === "overlay" && comparisonData.length ? (mode === "count" ? "publishedA" : "publishedDurationA") : mode === "count" ? "published" : "publishedDuration"} name={`${context.dashboardContext.label} ${mode === "count" ? "Published Count" : "Published Duration"}`} fill={chartColors.published} radius={[0, 8, 8, 0]} />
              {context.viewMode === "overlay" && comparisonData.length ? (
                <Bar dataKey={mode === "count" ? "publishedB" : "publishedDurationB"} name={`${context.comparisonContext?.label ?? "Context B"} ${mode === "count" ? "Published Count" : "Published Duration"}`} fill="hsl(var(--chart-1))" radius={[0, 8, 8, 0]} />
              ) : null}
            </BarChart>
          )}
        </ResponsiveContainer>
      </WhiteChartCanvas>
    </WidgetChrome>
  );
}

function PieChartWidget({ widget, context }: WidgetComponentProps) {
  const rows = getWidgetData("channelPerformance", widget.config, context.dashboardContext) as Array<Record<string, string | number>>;
  const data = rows.slice(0, 5).map((row) => ({ name: String(row.channel), value: Number(row.published) }));

  return (
    <WidgetChrome
      title={widget.title}
      description={widget.config.description}
      exportRows={data.map((row) => ({ ...row, context: context.dashboardContext.label }))}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
    >
      <WhiteChartCanvas>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={60} outerRadius={100}>
              {data.map((row, index) => (
                <Cell key={row.name} fill={platformPalette[index % platformPalette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </WhiteChartCanvas>
    </WidgetChrome>
  );
}

function TableWidget({ widget, context }: WidgetComponentProps) {
  if (widget.queryKey === "videoList") {
    return <VideoListWidget widget={widget} context={context} />;
  }

  const mode = widget.config.metricMode ?? "count";
  const data = getWidgetData(widget.queryKey, widget.config, context.dashboardContext) as Array<Record<string, string | number>>;
  const { columns, rows } = buildWidgetTable(widget, data, mode);

  return (
    <WidgetChrome
      title={widget.title}
      description={widget.config.description}
      exportRows={rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])))}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
    >
      <SimpleDataTable columns={columns} rows={rows} />
    </WidgetChrome>
  );
}

function VideoListWidget({ widget, context }: { widget: WidgetSchema; context: WidgetDataContext }) {
  const videos = getWidgetData(widget.queryKey, widget.config, context.dashboardContext) as VideoRecord[];
  const exportRows = videos.map((video) => ({
    headline: video.title,
    url: "Web URL",
    published: video.publishedStatus === "Published" ? "Yes" : "No",
    downloaded: video.downloads > 0 ? "Yes" : "No",
    team: video.team,
    type: video.inputType,
    outputType: video.outputType,
    uploadedBy: video.user,
    videoId: video.id.replace("VID-", ""),
    platform: video.channel
  }));

  return (
    <WidgetChrome
      title={widget.title}
      description="A simple searchable list of recent video records."
      exportRows={exportRows}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
      actions={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search videos"
              className="h-10 rounded-md border border-white/10 bg-[#2d3147] pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <Button
            type="button"
            data-widget-control="true"
            className="rounded-full bg-[#d3455d] px-5 font-bold text-white hover:bg-[#e14e68]"
            onClick={() => downloadCsv("frammer-video-list.csv", exportRows)}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            type="button"
            data-widget-control="true"
            className="rounded-full bg-[#d3455d] px-5 font-bold text-white hover:bg-[#e14e68]"
            onClick={() => downloadPdf("frammer-video-list.pdf", "Frammer Video List", exportRows)}
          >
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      }
    >
      <div className="h-full overflow-auto">
        <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {["Headline", "URL", "Published", "Downloaded", "Team Name", "Type", "Output Type", "Uploaded By", "Video ID", "Published Platform"].map((column) => (
                <th key={column} className="bg-white px-3 py-3 font-black text-slate-800">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} className="border-b border-slate-500/70 odd:bg-white/[0.03]">
                <td className="max-w-[28rem] px-3 py-3 font-semibold text-blue-300">{video.title}</td>
                <td className="px-3 py-3 font-semibold text-blue-300">Web URL</td>
                <td className="px-3 py-3 font-semibold text-slate-100">{video.publishedStatus === "Published" ? "Yes" : "No"}</td>
                <td className="px-3 py-3 font-semibold text-slate-100">{video.downloads > 0 ? "Yes" : "No"}</td>
                <td className="px-3 py-3 font-semibold text-slate-100">{video.team}</td>
                <td className="px-3 py-3 font-semibold text-slate-100">{video.inputType}</td>
                <td className="px-3 py-3 font-semibold text-slate-100">{video.outputType}</td>
                <td className="px-3 py-3 font-semibold text-slate-100">{video.user}</td>
                <td className="px-3 py-3 font-semibold text-slate-100">{video.id.replace("VID-", "")}</td>
                <td className="px-3 py-3 font-semibold text-slate-100">{video.channel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetChrome>
  );
}

function HeatmapWidget({ widget, context }: WidgetComponentProps) {
  const data = getWidgetData(widget.queryKey, widget.config, context.dashboardContext) as number[][];
  const max = Math.max(...data.flat());

  return (
    <WidgetChrome
      title={widget.title}
      description="Placeholder extension point for future heatmap query results."
      exportRows={data.flat().map((value, index) => ({ cell: index + 1, value, context: context.dashboardContext.label }))}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
    >
      <div className="grid grid-cols-4 gap-2">
        {data.flat().map((value, index) => (
          <div
            key={index}
            className="rounded-md px-3 py-5 text-center text-sm font-black text-white"
            style={{ background: `hsl(var(--primary) / ${0.2 + value / max / 1.4})` }}
          >
            {value}
          </div>
        ))}
      </div>
    </WidgetChrome>
  );
}

function AiInsightWidget({ widget, context }: WidgetComponentProps) {
  const data = getWidgetData(widget.queryKey, widget.config, context.dashboardContext) as { title: string; body: string };

  return (
    <WidgetChrome
      title={widget.title}
      description="AI insight card placeholder for future NLQ-generated widgets."
      exportRows={[{ title: data.title, insight: data.body, context: context.dashboardContext.label }]}
      exportFileName={widget.title}
      onRemove={context.removeWidget ? () => context.removeWidget?.(widget.id) : undefined}
    >
      <div className="rounded-lg bg-[#2d3147] p-4">
        <div className="flex items-center gap-2 text-sm font-black text-[#ef405b]">
          <Sparkles className="h-4 w-4" />
          {data.title}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{data.body}</p>
      </div>
    </WidgetChrome>
  );
}

function buildWidgetTable(widget: WidgetSchema, data: Array<Record<string, string | number>>, mode: "count" | "duration") {
  if (widget.queryKey === "timeTrend") {
    const timeGroup = widget.config.timeGroup ?? "day";
    return {
      columns: [timeGroupLabel(timeGroup), "Uploaded", "Processed", "Published"],
      rows: data.slice(0, 8).map((row) => [
        String(row.label),
        formatMetricValue(Number(row[mode === "count" ? "uploaded" : "uploadedDuration"]), mode),
        formatMetricValue(Number(row[mode === "count" ? "processed" : "processedDuration"]), mode),
        formatMetricValue(Number(row[mode === "count" ? "published" : "publishedDuration"]), mode)
      ])
    };
  }

  if (widget.queryKey === "platformDistribution") {
    return {
      columns: ["Channel Name", ...platformKeys],
      rows: data.map((row) => [
        String(row.channel),
        ...platformKeys.map((platform) => formatMetricValue(Number(row[`${platform}-${mode}`] ?? 0), mode))
      ])
    };
  }

  return {
    columns: mode === "count" ? ["Channel Name", "Uploaded", "Processed", "Published"] : ["Channel Name", "Uploaded Duration", "Processed Duration", "Published Duration"],
    rows: data.map((row) =>
      mode === "count"
        ? [String(row.channel), Number(row.uploaded), Number(row.processed), Number(row.published)]
        : [String(row.channel), formatMinutes(Number(row.uploadedDuration)), formatMinutes(Number(row.processedDuration)), formatMinutes(Number(row.publishedDuration))]
    )
  };
}

function getTrendKey(metric: string) {
  if (metric === "processed") return "processed";
  if (metric === "published" || metric === "publishRate") return "published";
  if (metric === "avgProcessing") return "processedDuration";
  if (metric.includes("Duration")) return metric;
  return "uploaded";
}

function getChartSyncId(widget: WidgetSchema, context: WidgetDataContext) {
  if (!context.compareMode || context.viewMode !== "split") return widget.id;
  return context.syncHover === false ? undefined : widget.id;
}

function getKpiDetail(metric: string, data: Record<string, number>) {
  if (metric === "uploaded") return formatMinutes(data.uploadedDuration ?? 0);
  if (metric === "processed") return formatMinutes(data.processedDuration ?? 0);
  if (metric === "published") return formatMinutes(data.publishedDuration ?? 0);
  if (metric === "downloads") return `${(data.downloadRate ?? 0).toFixed(1)} per published`;
  if (metric === "publishRate") return "Published / uploaded";
  if (metric === "avgProcessing") return "Per processed video";
  return "Configured metric";
}

function formatDeltaValue(value: number, metric: string) {
  const absolute = Math.abs(value);
  if (metric.includes("Duration") || metric === "avgProcessing") return formatMinutes(absolute);
  if (metric === "publishRate") return `${Math.round(absolute)} pts`;
  return Math.round(absolute).toLocaleString();
}

function mergeTimeSeries(current: Array<Record<string, string | number>>, comparison: Array<Record<string, string | number>>) {
  const byLabel = new Map<string, Record<string, string | number>>();

  current.forEach((row) => {
    byLabel.set(String(row.label), suffixRecord(row, "A", "label"));
  });

  comparison.forEach((row) => {
    const label = String(row.label);
    byLabel.set(label, {
      label,
      ...(byLabel.get(label) ?? {}),
      ...suffixRecord(row, "B", "label")
    });
  });

  return Array.from(byLabel.values());
}

function mergeCategorySeries(current: Array<Record<string, string | number>>, comparison: Array<Record<string, string | number>>) {
  const byChannel = new Map<string, Record<string, string | number>>();

  current.forEach((row) => {
    byChannel.set(String(row.channel), suffixRecord(row, "A", "channel"));
  });

  comparison.forEach((row) => {
    const channel = String(row.channel);
    byChannel.set(channel, {
      channel,
      ...(byChannel.get(channel) ?? {}),
      ...suffixRecord(row, "B", "channel")
    });
  });

  return Array.from(byChannel.values());
}

function mergePlatformSeries(current: Array<Record<string, string | number>>, comparison: Array<Record<string, string | number>>) {
  const byChannel = new Map<string, Record<string, string | number>>();

  current.forEach((row) => {
    byChannel.set(String(row.channel), suffixRecord(row, "A", "channel"));
  });

  comparison.forEach((row) => {
    const channel = String(row.channel);
    byChannel.set(channel, {
      channel,
      ...(byChannel.get(channel) ?? {}),
      ...suffixRecord(row, "B", "channel")
    });
  });

  return Array.from(byChannel.values());
}

function suffixRecord(row: Record<string, string | number>, suffix: string, identityKey: string) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key === identityKey ? key : `${key}${suffix}`, value])
  );
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          return JSON.stringify(String(value));
        })
        .join(",")
    )
  ].join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(filename: string, title: string, rows: Array<Record<string, string | number>>) {
  const lines = [
    title,
    `Generated ${new Date().toLocaleString()}`,
    "",
    ...rows.flatMap((row, index) => [
      `${index + 1}. ${row.headline ?? "Untitled video"}`,
      `Published: ${row.published ?? "-"} | Downloaded: ${row.downloaded ?? "-"} | Platform: ${row.platform ?? "-"}`,
      `Uploaded by: ${row.uploadedBy ?? "-"} | Video ID: ${row.videoId ?? "-"}`,
      ""
    ])
  ];
  const pdf = createTextPdf(lines);
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createTextPdf(lines: string[]) {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 48;
  const marginTop = 64;
  const lineHeight = 16;
  const linesPerPage = Math.floor((pageHeight - marginTop * 2) / lineHeight);
  const pages = chunk(lines.map((line) => wrapPdfLine(line)), linesPerPage);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`
  ];

  pages.forEach((pageLines, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectId} 0 R >>`);
    const content = [
      "BT",
      "/F1 10 Tf",
      "14 TL",
      `${marginX} ${pageHeight - marginTop} Td`,
      ...pageLines.map((line, lineIndex) => `${lineIndex === 0 ? "" : "T* "}${escapePdfText(line)} Tj`),
      "ET"
    ].join("\n");
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return body;
}

function wrapPdfLine(line: string) {
  return line.length > 96 ? `${line.slice(0, 93)}...` : line;
}

function escapePdfText(value: string) {
  return `(${value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}
