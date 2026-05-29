"use client";

import { Download, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { calculateDelta } from "@/lib/widgets/dashboard-data";
import { useWidgetData } from "@/lib/widgets/use-widget-data";
import type { DashboardContext } from "@/lib/widgets/types";

const metrics = [
  { key: "uploaded", label: "Uploaded" },
  { key: "processed", label: "Processed" },
  { key: "published", label: "Published" },
  { key: "downloads", label: "Downloads" },
  { key: "publishRate", label: "Publish Rate" }
];

type ComparisonSummaryBannerProps = {
  left: DashboardContext;
  right?: DashboardContext;
  // Optional export action — when provided (split view), the banner doubles
  // as the side-by-side action bar so we don't repeat "Context A vs B"
  // again on a separate section header.
  exportAction?: { onClick: () => void; disabled: boolean; label: string };
};

export function ComparisonSummaryBanner({ left, right, exportAction }: ComparisonSummaryBannerProps) {
  const { data: leftRaw } = useWidgetData<Record<string, number>>("summary", {}, left);
  const { data: rightRaw } = useWidgetData<Record<string, number>>(right ? "summary" : null, {}, right);
  if (!right) return null;

  const leftSummary = leftRaw ?? {};
  const rightSummary = rightRaw ?? {};
  const deltas = metrics
    .map((metric) => ({
      ...metric,
      ...calculateDelta(leftSummary[metric.key] ?? 0, rightSummary[metric.key] ?? 0)
    }))
    .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));

  const biggestIncrease = deltas.find((item) => item.direction === "up") ?? deltas[0];
  const biggestDrop = deltas.find((item) => item.direction === "down");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-gradient-to-r dark:from-[#24283d] dark:to-[#202335] dark:shadow-xl dark:shadow-black/20">
      <div className="flex flex-wrap items-center gap-3">
        {/* Left: A vs B identity chips — tiny, scannable, no redundant h2 */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <ContextChip label={left.label} tone="sky" />
          <span className="text-slate-400 dark:text-slate-500">vs</span>
          <ContextChip label={right.label} tone="rose" />
        </div>

        {/* Right: delta pills + optional export action all on one row */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DeltaPill
            label="Biggest increase"
            value={`${biggestIncrease.label} ${biggestIncrease.percent > 0 ? "+" : ""}${biggestIncrease.percent}%`}
            positive
          />
          <DeltaPill
            label="Biggest drop"
            value={biggestDrop ? `${biggestDrop.label} ${biggestDrop.percent}%` : "No drop detected"}
            positive={!biggestDrop}
          />
          {exportAction ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-md border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#24283d] dark:text-slate-200 dark:hover:bg-[#2d3147]"
              disabled={exportAction.disabled}
              onClick={exportAction.onClick}
              title={exportAction.label}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ContextChip({ label, tone }: { label: string; tone: "sky" | "rose" }) {
  const toneClasses =
    tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200"
      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "sky" ? "bg-sky-400" : "bg-rose-400"}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function DeltaPill({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  const toneClasses = positive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200"
    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200";
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2.5 py-1 ${toneClasses}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="leading-tight">
        <div className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</div>
        <div className="text-xs font-black">{value}</div>
      </div>
    </div>
  );
}
