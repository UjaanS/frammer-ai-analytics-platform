"use client";

import { ArrowLeftRight, Copy, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompareBy, ComparisonViewMode } from "@/lib/widgets/types";

// Compare-mode-only controls. The mode toggle (Single / Compare) lives in
// the ContextFilterPanel bar now; this strip only renders when comparison
// is active and exposes the compare-specific options.
//
// Sync filters / sync hover toggles were removed — compareBy already drives
// filter / date sync between contexts, and hover-sync defaults to true and
// works automatically in split view via the chart syncId path.
export function ComparisonToolbar({
  compareMode,
  compareBy,
  viewMode,
  onCompareByChange,
  onViewModeChange,
  onCloneLeftToRight,
  onSwapContexts,
  onReset
}: {
  compareMode: boolean;
  compareBy: CompareBy;
  viewMode: ComparisonViewMode;
  onCompareByChange: (value: CompareBy) => void;
  onViewModeChange: (value: ComparisonViewMode) => void;
  onCloneLeftToRight: () => void;
  onSwapContexts: () => void;
  onReset: () => void;
}) {
  if (!compareMode) return null;

  return (
    <section className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#24283d]/80">
      <ControlGroup label="By">
        {(["time", "dimension", "custom"] as CompareBy[]).map((mode) => (
          <SegmentButton key={mode} active={compareBy === mode} onClick={() => onCompareByChange(mode)}>
            {mode}
          </SegmentButton>
        ))}
      </ControlGroup>

      <Divider />

      <ControlGroup label="View">
        {(["split", "overlay"] as ComparisonViewMode[]).map((mode) => (
          <SegmentButton key={mode} active={viewMode === mode} onClick={() => onViewModeChange(mode)}>
            {mode === "split" ? "Split" : "Overlay"}
          </SegmentButton>
        ))}
      </ControlGroup>

      <div className="ml-auto flex items-center gap-1">
        <IconAction title="Apply context A to B" onClick={onCloneLeftToRight}>
          <Copy className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction title="Swap A ↔ B" onClick={onSwapContexts}>
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction title="Reset comparison" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconAction>
      </div>
    </section>
  );
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <div className="inline-flex rounded-md bg-slate-100 p-0.5 dark:bg-white/[0.04]">{children}</div>
    </div>
  );
}

// Active state matches the count/duration toggle in widget-controls.tsx —
// solid #ef405b background, white text, consistent across every toggle in
// the dashboard.
function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5 text-[11px] font-semibold capitalize transition",
        active
          ? "bg-[#ef405b] text-white"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function IconAction({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="h-7 w-7 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <div className="h-4 w-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />;
}
