"use client";

import { ArrowLeftRight, Copy, Crosshair, GitCompareArrows, Layers2, RotateCcw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { CompareBy, ComparisonViewMode } from "@/lib/widgets/types";

export function ComparisonToolbar({
  compareMode,
  compareBy,
  viewMode,
  syncFilters,
  syncHover,
  onCompareModeChange,
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
  onCompareModeChange: (enabled: boolean) => void;
  onCompareByChange: (value: CompareBy) => void;
  onViewModeChange: (value: ComparisonViewMode) => void;
  onSyncFiltersChange: (enabled: boolean) => void;
  onSyncHoverChange: (enabled: boolean) => void;
  onCloneLeftToRight: () => void;
  onSwapContexts: () => void;
  onReset: () => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#24283d]/80 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur transition-all duration-300">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-[#2d3147] p-1">
            <SegmentButton active={!compareMode} onClick={() => onCompareModeChange(false)}>
              Dashboard
            </SegmentButton>
            <SegmentButton active={compareMode} onClick={() => onCompareModeChange(true)}>
              <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" />
              Compare
            </SegmentButton>
          </div>

          <div className="hidden h-6 w-px bg-white/10 md:block" />

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Sparkles className="h-4 w-4 text-[#ef405b]" />
            <span className="font-semibold text-slate-300">Context-driven analytics</span>
            <span className="hidden sm:inline">ready for natural-language filters</span>
          </div>
        </div>

        <Button variant="ghost" className="h-9 self-start rounded-full px-3 text-slate-400 hover:bg-white/5 hover:text-white xl:self-auto" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className={`grid gap-3 transition-all duration-300 ${compareMode ? "mt-4 max-h-40 opacity-100" : "mt-0 max-h-0 overflow-hidden opacity-0"} xl:grid-cols-[auto_auto_1fr]`}>
        <ControlGroup label="Compare by">
          {(["time", "dimension", "custom"] as CompareBy[]).map((mode) => (
            <SegmentButton key={mode} active={compareBy === mode} onClick={() => onCompareByChange(mode)}>
              {mode}
            </SegmentButton>
          ))}
        </ControlGroup>

        <ControlGroup label="View">
          {(["split", "overlay"] as ComparisonViewMode[]).map((mode) => (
            <SegmentButton key={mode} active={viewMode === mode} onClick={() => onViewModeChange(mode)}>
              {mode === "split" ? "Split" : "Overlay"}
            </SegmentButton>
          ))}
        </ControlGroup>

        <div className="flex flex-wrap items-end justify-start gap-2 xl:justify-end">
          <ToolbarButton onClick={onCloneLeftToRight}>
            <Copy className="mr-2 h-4 w-4" />
            Apply A to B
          </ToolbarButton>
          <ToolbarButton onClick={onSwapContexts}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Swap
          </ToolbarButton>
          <button
            type="button"
            onClick={() => onSyncFiltersChange(!syncFilters)}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-bold transition ${
              syncFilters ? "border-[#ef405b]/50 bg-[#ef405b]/15 text-rose-100" : "border-white/10 bg-[#2d3147] text-slate-300 hover:bg-white/10"
            }`}
          >
            <Layers2 className="h-4 w-4" />
            Sync filters/date
          </button>
          <button
            type="button"
            onClick={() => onSyncHoverChange(!syncHover)}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-bold transition ${
              syncHover ? "border-sky-300/40 bg-sky-400/10 text-sky-100" : "border-white/10 bg-[#2d3147] text-slate-300 hover:bg-white/10"
            }`}
          >
            <Crosshair className="h-4 w-4" />
            Sync hover
          </button>
        </div>
      </div>
    </section>
  );
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <div className="inline-flex rounded-full bg-[#2d3147] p-1">{children}</div>
    </div>
  );
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-black capitalize transition ${active ? "bg-[#ef405b] text-white shadow shadow-[#ef405b]/20" : "text-slate-300 hover:bg-white/5"}`}
    >
      {children}
    </button>
  );
}

function ToolbarButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-full border border-white/10 bg-[#2d3147] px-3 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
