"use client";

import { useCallback, useRef, useState } from "react";

import { useDashboardState } from "@/hooks/use-dashboard-state";
import { useComparisonDashboardState } from "@/hooks/use-comparison-dashboard-state";
import { ComparisonSummaryBanner } from "@/components/compare/comparison-summary-banner";
import { ComparisonToolbar } from "@/components/compare/comparison-toolbar";
import { ContextFilterPanel } from "@/components/compare/context-filter-panel";
import { NlqInput } from "@/components/compare/nlq-input";
import { DashboardGrid } from "@/components/widgets/dashboard-renderer";
import { exportElementAsPng } from "@/lib/export/client-export";
import { applyNlqActions } from "@/lib/nlq/apply-actions";
import type { NlqContextSnapshot, NlqResponse } from "@/lib/nlq/types";
import type { Persona } from "@/lib/widgets/dashboard-presets";
import type { DashboardDefinition } from "@/lib/widgets/types";

type ComparisonDashboardProps = {
  definition: DashboardDefinition;
  setPersona?: (persona: Persona) => void;
};

export function ComparisonDashboard({ definition, setPersona }: ComparisonDashboardProps) {
  const splitExportRef = useRef<HTMLDivElement>(null);
  const [exportingSplit, setExportingSplit] = useState(false);
  const comparison = useComparisonDashboardState();
  const [leftContext, rightContext] = comparison.contexts;
  const shouldCompare = comparison.state.compareMode && Boolean(rightContext);
  // Only the split-view comparison renders the grid inside narrow panels
  // (6 cols each). Overlay-view comparison renders a single 12-col grid
  // just like the non-compare dashboard, so it should reuse the dashboard
  // layout — not the comparison layout (which is sized for the narrow
  // panel and would pack widgets into the left half of a wide canvas).
  const isSplitCompare = shouldCompare && comparison.state.viewMode === "split";
  const dashboard = useDashboardState(definition, isSplitCompare ? "comparison" : "dashboard");

  // Resolve the active persona from the definition id (set in dashboard-presets.ts).
  const activePersona: Persona = definition.id.endsWith("-admin")
    ? "admin"
    : definition.id.endsWith("-tech")
      ? "tech"
      : "client";

  // NLQ submit handler — POSTs the query + current state, then dispatches
  // the returned actions through the existing dashboard/comparison hooks.
  const handleNlqSubmit = useCallback(
    async (query: string): Promise<{ summary: string }> => {
      const snapshot: NlqContextSnapshot = {
        persona: activePersona,
        compareMode: comparison.state.compareMode,
        viewMode: comparison.state.viewMode,
        contexts: comparison.contexts.map((ctx) => ({
          id: ctx.id,
          label: ctx.label,
          filters: ctx.filters,
          dateRange: ctx.dateRange
        })),
        widgetIds: dashboard.widgets.filter((w) => w.visible !== false).map((w) => w.id)
      };

      const response = await fetch("/api/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, state: snapshot })
      });

      const result = (await response.json()) as NlqResponse;
      if (!result.ok) throw new Error(result.error);

      applyNlqActions(result.actions, {
        updateContextFilters: comparison.updateContextFilters,
        updateContextDateRange: comparison.updateContextDateRange,
        setCompareMode: comparison.setCompareMode,
        setViewMode: comparison.setViewMode,
        setPersona: setPersona ?? (() => {}),
        addWidget: dashboard.addWidget,
        removeWidget: dashboard.removeWidget,
        updateWidgetConfig: dashboard.updateWidgetConfig,
        resetDashboard: dashboard.resetDashboard,
        organizeDashboard: dashboard.organizeDashboard,
        layoutMode: isSplitCompare ? "comparison" : "dashboard"
      });

      return { summary: result.summary };
    },
    [activePersona, comparison, dashboard, setPersona, isSplitCompare]
  );

  async function exportSplitComparison() {
    if (!splitExportRef.current || exportingSplit) return;
    setExportingSplit(true);
    try {
      await exportElementAsPng(splitExportRef.current, "frammer-side-by-side-comparison.png");
    } finally {
      setExportingSplit(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* NLQ hero — primary interaction surface, present in both modes. */}
      <NlqInput onSubmit={handleNlqSubmit} />

      {shouldCompare ? (
        <>
          {/* Single-context bar carrying just the mode toggle so the user
              can drop back to dashboard view without hunting; per-context
              filters live in the two ComparisonContextCards below. */}
          <ContextFilterPanel
            context={leftContext}
            compareMode
            onUpdateFilters={comparison.updateContextFilters}
            onUpdateDateRange={comparison.updateContextDateRange}
            onCompareModeChange={comparison.setCompareMode}
          />
          <ComparisonToolbar
            compareMode={comparison.state.compareMode}
            compareBy={comparison.state.compareBy}
            viewMode={comparison.state.viewMode}
            syncFilters={comparison.state.syncFilters}
            syncHover={comparison.state.syncHover}
            onCompareByChange={comparison.setCompareBy}
            onViewModeChange={comparison.setViewMode}
            onSyncFiltersChange={comparison.setSyncFilters}
            onSyncHoverChange={comparison.setSyncHover}
            onCloneLeftToRight={comparison.cloneLeftToRight}
            onSwapContexts={comparison.swapContexts}
            onReset={comparison.resetComparison}
          />
          {comparison.state.viewMode === "split" ? (
            // Split view: dual side-by-side cards mirror the dual grid panels below.
            <section className="grid items-stretch gap-3 transition-all duration-300 xl:grid-cols-[1fr_auto_1fr]">
              <ContextFilterPanel
                context={leftContext}
                compact
                onUpdateFilters={comparison.updateContextFilters}
                onUpdateDateRange={comparison.updateContextDateRange}
              />
              <div className="flex items-center justify-center">
                <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-[#24283d] dark:text-slate-400">
                  VS
                </span>
              </div>
              {rightContext ? (
                <ContextFilterPanel
                  context={rightContext}
                  compact
                  onUpdateFilters={comparison.updateContextFilters}
                  onUpdateDateRange={comparison.updateContextDateRange}
                />
              ) : null}
            </section>
          ) : (
            // Overlay view: dashboard is single full-width below; render
            // context A as the primary editor + context B as a compact
            // secondary card so the section reads "two overlaid contexts"
            // not "two split panels".
            <section className="space-y-2 transition-all duration-300">
              <ContextFilterPanel
                context={leftContext}
                compact
                onUpdateFilters={comparison.updateContextFilters}
                onUpdateDateRange={comparison.updateContextDateRange}
              />
              {rightContext ? (
                <ContextFilterPanel
                  context={rightContext}
                  compact
                  onUpdateFilters={comparison.updateContextFilters}
                  onUpdateDateRange={comparison.updateContextDateRange}
                />
              ) : null}
              <p className="px-1 text-[11px] text-slate-500 dark:text-slate-400">
                Charts below layer <span className="font-semibold text-sky-600 dark:text-sky-300">{leftContext.label}</span> over <span className="font-semibold text-rose-600 dark:text-rose-300">{rightContext?.label}</span> on the same axes.
              </p>
            </section>
          )}
        </>
      ) : (
        <ContextFilterPanel
          context={leftContext}
          compareMode={false}
          onUpdateFilters={comparison.updateContextFilters}
          onUpdateDateRange={comparison.updateContextDateRange}
          onCompareModeChange={comparison.setCompareMode}
        />
      )}

      {/* Summary banner doubles as the side-by-side action bar in split view
          so the "Context A vs Context B" identity isn't repeated three times
          stacked. Export action only renders when there's something to
          export (split view + both panels mounted). */}
      {shouldCompare ? (
        <ComparisonSummaryBanner
          left={leftContext}
          right={rightContext}
          exportAction={
            comparison.state.viewMode === "split"
              ? { onClick: exportSplitComparison, disabled: exportingSplit, label: "Export both panels" }
              : undefined
          }
        />
      ) : null}

      {shouldCompare && comparison.state.viewMode === "split" ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111421] dark:shadow-xl dark:shadow-black/20">
          <div className="max-h-[calc(100vh-11rem)] min-h-[70vh] overflow-y-auto">
            <div ref={splitExportRef} className="grid items-start gap-px bg-slate-200 xl:grid-cols-2 dark:bg-white/10">
              {comparison.contexts.map((context, index) => (
                <section key={context.id} className="min-w-0 bg-slate-50 p-4 dark:bg-[#10131f]">
                  <div className={`mb-4 h-1 rounded-full ${index === 0 ? "bg-sky-400/70" : "bg-rose-400/70"}`} />
                  <DashboardGrid
                    definition={definition}
                    widgets={dashboard.widgets}
                    layout={dashboard.layout}
                    dashboardContext={context}
                    comparisonContext={comparison.contexts[index === 0 ? 1 : 0]}
                    compareMode={comparison.state.compareMode}
                    viewMode="split"
                    syncHover={comparison.state.syncHover}
                    chrome="panel"
                    showActions={index === 0}
                    updateLayout={dashboard.updateLayout}
                    updateWidgetConfig={dashboard.updateWidgetConfig}
                    addWidget={dashboard.addWidget}
                    removeWidget={dashboard.removeWidget}
                    resetDashboard={dashboard.resetDashboard}
                    organizeDashboard={dashboard.organizeDashboard}
                  />
                </section>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <DashboardGrid
          definition={definition}
          widgets={dashboard.widgets}
          layout={dashboard.layout}
          dashboardContext={leftContext}
          comparisonContext={shouldCompare ? rightContext : undefined}
          compareMode={comparison.state.compareMode}
          viewMode={comparison.state.viewMode}
          syncHover={comparison.state.syncHover}
          updateLayout={dashboard.updateLayout}
          updateWidgetConfig={dashboard.updateWidgetConfig}
          addWidget={dashboard.addWidget}
          removeWidget={dashboard.removeWidget}
          resetDashboard={dashboard.resetDashboard}
          organizeDashboard={dashboard.organizeDashboard}
        />
      )}
    </div>
  );
}
