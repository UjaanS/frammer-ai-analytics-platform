"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { WidgetSchema, WidgetType, WidgetQueryKey } from "@/lib/widgets/types";

const widgetTypes: Array<{ value: WidgetType; label: string; queryKey: WidgetQueryKey }> = [
  { value: "kpi", label: "KPI Card", queryKey: "summary" },
  { value: "line-chart", label: "Line Chart", queryKey: "timeTrend" },
  { value: "bar-chart", label: "Bar Chart", queryKey: "channelPerformance" },
  { value: "pie-chart", label: "Pie Chart", queryKey: "channelPerformance" },
  { value: "table", label: "Table", queryKey: "channelPerformance" },
  { value: "heatmap", label: "Heatmap Placeholder", queryKey: "qualityHeatmap" },
  { value: "ai-insight", label: "AI Insight Placeholder", queryKey: "aiInsight" }
];

const metrics = ["uploaded", "processed", "published", "downloads", "duration", "processing"];
const dimensions = ["channel", "platform", "company", "user", "outputType"];

export function AddWidgetModal({ onAddWidget }: { onAddWidget: (widget: WidgetSchema) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<WidgetType>("kpi");
  const [metric, setMetric] = useState("published");
  const [dimension, setDimension] = useState("channel");

  function createWidget() {
    const selected = widgetTypes.find((item) => item.value === type) ?? widgetTypes[0];
    const id = `custom-${type}-${Date.now()}`;
    onAddWidget({
      id,
      type,
      title: `${selected.label}: ${metric}`,
      queryKey: selected.queryKey,
      size: type === "kpi" ? "sm" : "lg",
      position: { i: id, x: 0, y: Infinity, w: type === "kpi" ? 2 : 6, h: type === "kpi" ? 2 : 5, minW: type === "kpi" ? 2 : 3, minH: type === "kpi" ? 2 : 4 },
      visible: true,
      config: {
        metric,
        dimension,
        metricMode: "count",
        timeGroup: "day",
        description: "Added from dashboard metadata. Later NLQ can generate this schema automatically."
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-white/10 bg-[#24283d] p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Add Widget</h2>
                <p className="mt-1 text-sm text-slate-400">Choose a widget type, metric, and dimension.</p>
              </div>
              <Button size="icon" variant="ghost" className="text-slate-300" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-5 grid gap-4">
              <Select label="Widget Type" value={type} options={widgetTypes.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => setType(value as WidgetType)} />
              <Select label="Metric" value={metric} options={metrics.map((item) => ({ value: item, label: item }))} onChange={setMetric} />
              <Select label="Dimension" value={dimension} options={dimensions.map((item) => ({ value: item, label: item }))} onChange={setDimension} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" className="text-slate-300" onClick={() => setOpen(false)}>Cancel</Button>
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
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-white/10 bg-[#2d3147] px-3 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-primary"
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
