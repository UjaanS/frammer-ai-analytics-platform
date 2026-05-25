import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ComparisonGridProps = {
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  rightLabel: string;
  className?: string;
};

export const ComparisonGrid = forwardRef<HTMLDivElement, ComparisonGridProps>(function ComparisonGrid(
  { left, right, leftLabel, rightLabel, className },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn("grid min-h-[70vh] items-stretch gap-px bg-slate-200 lg:grid-cols-2 dark:bg-white/10", className)}
    >
      <ComparisonPanel label={leftLabel} accent="bg-sky-400/70">
        {left}
      </ComparisonPanel>
      <ComparisonPanel label={rightLabel} accent="bg-rose-400/70">
        {right}
      </ComparisonPanel>
    </div>
  );
});

function ComparisonPanel({ label, accent, children }: { label: string; accent: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden bg-slate-50 dark:bg-[#10131f]">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#10131f]/95">
        <div className={cn("mb-2 h-1 rounded-full", accent)} />
        <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Comparison context</p>
        <h3 className="truncate text-base font-black text-slate-900 dark:text-slate-100">{label}</h3>
      </div>
      <div className="max-h-[calc(100vh-15rem)] min-h-[60vh] overflow-y-auto p-3 lg:p-4">{children}</div>
    </section>
  );
}
