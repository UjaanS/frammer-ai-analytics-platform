"use client";

import type { MetricMode, TimeGroup } from "@/lib/widgets/types";

export function ModeToggle({
  value,
  onChange
}: {
  value: MetricMode;
  onChange: (value: MetricMode) => void;
}) {
  return (
    <div className="flex rounded-full bg-slate-100 p-1 dark:bg-[#2d3147]">
      {(["count", "duration"] as MetricMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          data-widget-control="true"
          onClick={() => onChange(mode)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
            value === mode
              ? "bg-[#ef405b] text-white"
              : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/5"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

export function TimeGroupToggle({
  value,
  onChange
}: {
  value: TimeGroup;
  onChange: (value: TimeGroup) => void;
}) {
  return (
    <div className="flex rounded-full bg-slate-100 p-1 dark:bg-[#2d3147]">
      {(["day", "month", "year"] as TimeGroup[]).map((item) => (
        <button
          key={item}
          type="button"
          data-widget-control="true"
          onClick={() => onChange(item)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
            value === item
              ? "bg-[#ef405b] text-white"
              : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/5"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
