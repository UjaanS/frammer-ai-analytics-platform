"use client";

import { ArrowLeftRight, Copy, Crosshair, Layers2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompareBy, ComparisonViewMode } from "@/lib/widgets/types";

// Compare-mode-only controls. The mode toggle (Single / Compare) lives in
// the ContextFilterPanel bar now; this strip only renders when comparison
// is active and exposes the compare-specific options.
export function ComparisonToolbar({
  compareMode,
  compareBy,
  viewMode,
  syncFilters,
  syncHover,
  onCompareByChange,
  onViewModeChange,
  onSyncFiltersChange,
  onSyncHoverChange,
  onCloneLeftToRight,
  onSwapContexts,
  onReset
}: {
  compareMode: boolean;
  compareBy: CompareBy;
  viewMode: ComparisonViewMode;
  syncFilters: boolean;
  syncHover: boolean;
  onCompareByChange: (value: CompareBy) => void;
  onViewModeChange: (value: ComparisonViewMode) => void;
  onSyncFiltersChange: (enabled: boolean) => void;
  onSyncHoverChange: (enabled: boolean) => void;
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

      <Divider />

      <SyncToggle active={syncFilters} icon={<Layers2 className="h-3 w-3" />} onClick={() => onSyncFiltersChange(!syncFilters)}>
        Sync filters
      </SyncToggle>
      <SyncToggle active={syncHover} icon={<Crosshair className="h-3 w-3" />} onClick={() => onSyncHoverChange(!syncHover)}>
        Sync hover
      </SyncToggle>

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

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5 text-[11px] font-semibold capitalize transition",
        active
          ? "bg-white text-slate-900 shadow-sm dark:bg-[#2d3147] dark:text-white"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function SyncToggle({ active, icon, onClick, children }: { active: boolean; icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition",
        active
          ? "border-[#ef405b]/40 bg-[#ef405b]/10 text-[#d3455d] dark:text-rose-200"
          : "border-slate-200 bg-white text-slate-500 hover:text-slate-700 dark:border-white/10 dark:bg-transparent dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      {icon}
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
