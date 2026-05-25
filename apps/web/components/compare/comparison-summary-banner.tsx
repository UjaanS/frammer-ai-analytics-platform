"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { calculateDelta, getWidgetData } from "@/lib/widgets/dashboard-data";
import type { DashboardContext } from "@/lib/widgets/types";

const metrics = [
  { key: "uploaded", label: "Uploaded" },
  { key: "processed", label: "Processed" },
  { key: "published", label: "Published" },
  { key: "downloads", label: "Downloads" },
  { key: "publishRate", label: "Publish Rate" }
];

export function ComparisonSummaryBanner({ left, right }: { left: DashboardContext; right?: DashboardContext }) {
  if (!right) return null;

  const leftSummary = getWidgetData("summary", {}, left) as Record<string, number>;
  const rightSummary = getWidgetData("summary", {}, right) as Record<string, number>;
  const deltas = metrics
    .map((metric) => ({
      ...metric,
      ...calculateDelta(leftSummary[metric.key] ?? 0, rightSummary[metric.key] ?? 0)
    }))
    .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));

  const biggestIncrease = deltas.find((item) => item.direction === "up") ?? deltas[0];
  const biggestDrop = deltas.find((item) => item.direction === "down");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gradient-to-r dark:from-[#24283d] dark:to-[#202335] dark:shadow-xl dark:shadow-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#ef405b]">Comparison Summary</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{left.label} vs {right.label}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[32rem]">
          <SummaryPill
            label="Biggest increase"
            value={`${biggestIncrease.label} ${biggestIncrease.percent > 0 ? "+" : ""}${biggestIncrease.percent}%`}
            positive
          />
          <SummaryPill
            label="Biggest drop"
            value={biggestDrop ? `${biggestDrop.label} ${biggestDrop.percent}%` : "No drop detected"}
            positive={!biggestDrop}
          />
        </div>
      </div>
    </section>
  );
}

function SummaryPill({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className={`rounded-lg border p-4 ${positive ? "border-emerald-300/60 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-500/10" : "border-rose-300/60 bg-rose-50 dark:border-rose-400/20 dark:bg-rose-500/10"}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
