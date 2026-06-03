"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { semanticMetrics } from "@/lib/analytics/semantic-catalog";
import type { WarehouseDatasetId } from "@/lib/analytics/warehouse";
import type { WidgetSchema, WidgetType, WidgetQueryKey } from "@/lib/widgets/types";

const widgetTypes: Array<{ value: WidgetType; label: string; queryKey: WidgetQueryKey }> = [
  { value: "kpi", label: "KPI Card", queryKey: "summary" },
  { value: "line-chart", label: "Line Chart", queryKey: "timeTrend" },
  { value: "bar-chart", label: "Bar Chart", queryKey: "channelPerformance" },
  { value: "pie-chart", label: "Pie Chart", queryKey: "channelPerformance" },
  { value: "table", label: "Table", queryKey: "channelPerformance" },
  { value: "funnel-chart", label: "Funnel Chart", queryKey: "channelPerformance" },
  { value: "warehouse-explorer", label: "Warehouse Explorer", queryKey: "videoList" },
  { value: "heatmap", label: "Heatmap Placeholder", queryKey: "qualityHeatmap" },
  { value: "ai-insight", label: "AI Insight Placeholder", queryKey: "aiInsight" }
];

const metrics = semanticMetrics.filter((metric) => metric.available && metric.id !== "publishPlatformHealth");
const warehouseDatasets: WarehouseDatasetId[] = ["videos", "serviceRequests", "publishSchedules", "clipcutRequests", "trendingSnapshots", "lineage", "qualityIssues"];
const datasetDimensions: Record<WarehouseDatasetId, string[]> = {
  videos: ["date", "company", "channel", "user", "language", "videoType", "sourcePlatform", "processingTurnaroundBucket", "status"],
  serviceRequests: ["date", "company", "channel", "user", "language", "videoType", "serviceType", "sourcePlatform", "status"],
  publishSchedules: ["date", "company", "channel", "user", "publishPlatform", "status"],
  clipcutRequests: ["date", "company", "channel", "user", "language", "videoType", "sourcePlatform", "status"],
  trendingSnapshots: ["date", "trendType", "country"],
  lineage: ["videoType"],
  qualityIssues: ["date", "loadRun", "sourceTable", "issueCode", "severity"]
};

export function AddWidgetModal({
  onAddWidget,
  hiddenWidgets = [],
  onRestoreWidget
}: {
  onAddWidget: (widget: WidgetSchema) => void;
  hiddenWidgets?: WidgetSchema[];
  onRestoreWidget?: (widgetId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<WidgetType>("kpi");
  const [metric, setMetric] = useState("videosIngested");
  const [dimension, setDimension] = useState("channel");
  const [dataset, setDataset] = useState<WarehouseDatasetId>("videos");

  function createWidget() {
    const selected = widgetTypes.find((item) => item.value === type) ?? widgetTypes[0];
    const selectedDimension = datasetDimensions[dataset].includes(dimension) ? dimension : datasetDimensions[dataset][0];
    const id = `custom-${type}-${Date.now()}`;
    onAddWidget({
      id,
      type,
      title: `${selected.label}: ${metric}`,
      queryKey: selected.queryKey,
      size: type === "kpi" ? "sm" : "lg",
      position: { i: id, x: 0, y: 0, w: type === "kpi" ? 3 : 6, h: type === "kpi" ? 2 : 5, minW: type === "kpi" ? 2 : 3, minH: type === "kpi" ? 2 : 4 },
      visible: true,
      config: type === "kpi"
        ? { metricId: metric, description: "Warehouse-backed semantic KPI." }
        : {
            dimension: selectedDimension,
            description: "Warehouse-backed widget added from dashboard metadata.",
            warehouseQuery: {
              dataset,
              groupBy: type === "warehouse-explorer" ? [datasetDimensions[dataset][0]] : [selectedDimension],
              metrics: [{ id: "recordCount", aggregation: "count" }],
              sortBy: "recordCount",
              sortDirection: "desc",
              limit: type === "warehouse-explorer" ? 25 : 500
            }
          }
    });
    setOpen(false);
  }

  return (
    <>
      <Button className="rounded-full bg-[#d3455d] px-5 font-bold text-white hover:bg-[#e14e68]" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Widget
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#24283d]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Add Widget</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a widget type, metric, and dimension.</p>
              </div>
              <Button size="icon" variant="ghost" className="text-slate-500 dark:text-slate-300" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-5 grid gap-4">
              {hiddenWidgets.length ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Restore hidden widgets</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hiddenWidgets.map((widget) => (
                      <button
                        key={widget.id}
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-[#2d3147] dark:text-slate-200 dark:hover:bg-white/10"
                        onClick={() => {
                          onRestoreWidget?.(widget.id);
                          setOpen(false);
                        }}
                      >
                        {widget.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <Select label="Widget Type" value={type} options={widgetTypes.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => setType(value as WidgetType)} />
              {type === "kpi" ? <Select label="Metric" value={metric} options={metrics.map((item) => ({ value: item.id, label: item.label }))} onChange={setMetric} /> : null}
              {type !== "kpi" ? <Select label="Dataset" value={dataset} options={warehouseDatasets.map((item) => ({ value: item, label: item }))} onChange={(value) => setDataset(value as WarehouseDatasetId)} /> : null}
              {type !== "kpi" && type !== "warehouse-explorer" ? <Select label="Dimension" value={datasetDimensions[dataset].includes(dimension) ? dimension : datasetDimensions[dataset][0]} options={datasetDimensions[dataset].map((item) => ({ value: item, label: item }))} onChange={setDimension} /> : null}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" className="text-slate-700 dark:text-slate-300" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-[#d3455d] font-bold text-white hover:bg-[#e14e68]" onClick={createWidget}>Save Widget</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary dark:border-white/10 dark:bg-[#2d3147] dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
