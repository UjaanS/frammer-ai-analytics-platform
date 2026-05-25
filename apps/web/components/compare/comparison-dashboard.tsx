"use client";

import { Download } from "lucide-react";
import { useRef, useState } from "react";

import { useDashboardState } from "@/hooks/use-dashboard-state";
import { useComparisonDashboardState } from "@/hooks/use-comparison-dashboard-state";
import { ComparisonSummaryBanner } from "@/components/compare/comparison-summary-banner";
import { ComparisonToolbar } from "@/components/compare/comparison-toolbar";
import { ContextFilterPanel } from "@/components/compare/context-filter-panel";
import { DashboardGrid } from "@/components/widgets/dashboard-renderer";
import { Button } from "@/components/ui/button";
import { exportElementAsPng } from "@/lib/export/client-export";
import { ComparisonGrid, ENABLE_NEW_GRID_SYSTEM } from "@/src/modules/analytics/layout";
import type { DashboardDefinition } from "@/lib/widgets/types";

export function ComparisonDashboard({ definition }: { definition: DashboardDefinition }) {
  const splitExportRef = useRef<HTMLDivElement>(null);
  const [exportingSplit, setExportingSplit] = useState(false);
  const dashboard = useDashboardState(definition);
  const comparison = useComparisonDashboardState();
  const [leftContext, rightContext] = comparison.contexts;
  const shouldCompare = comparison.state.compareMode && Boolean(rightContext);

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
    <div className="space-y-6">
      <ComparisonToolbar
        compareMode={comparison.state.compareMode}
        compareBy={comparison.state.compareBy}
        viewMode={comparison.state.viewMode}
        syncFilters={comparison.state.syncFilters}
        syncHover={comparison.state.syncHover}
        onCompareModeChange={comparison.setCompareMode}
        onCompareByChange={comparison.setCompareBy}
        onViewModeChange={comparison.setViewMode}
        onSyncFiltersChange={comparison.setSyncFilters}
        onSyncHoverChange={comparison.setSyncHover}
        onCloneLeftToRight={comparison.cloneLeftToRight}
        onSwapContexts={comparison.swapContexts}
        onReset={comparison.resetComparison}
      />

      {shouldCompare ? (
        <section className="grid items-stretch gap-4 transition-all duration-300 xl:grid-cols-[1fr_auto_1fr]">
          <ContextFilterPanel
            context={leftContext}
            compact
            onUpdateFilters={comparison.updateContextFilters}
            onUpdateDateRange={comparison.updateContextDateRange}
          />
          <div className="flex items-center justify-center">
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-[#24283d] dark:text-slate-400 dark:shadow-lg dark:shadow-black/20">
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
        <ContextFilterPanel
          context={leftContext}
          onUpdateFilters={comparison.updateContextFilters}
          onUpdateDateRange={comparison.updateContextDateRange}
        />
      )}

      {shouldCompare ? <ComparisonSummaryBanner left={leftContext} right={rightContext} /> : null}

      {shouldCompare && comparison.state.viewMode === "split" ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111421] dark:shadow-xl dark:shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-[#1b1f31]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ef405b]">Side-by-side comparison</p>
              <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{leftContext.label} vs {rightContext?.label}</h2>
            </div>
            <Button
              variant="outline"
              className="self-start border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:self-auto dark:border-white/10 dark:bg-[#24283d] dark:text-slate-200 dark:hover:bg-[#2d3147]"
              disabled={exportingSplit}
              onClick={exportSplitComparison}
            >
              <Download className="mr-2 h-4 w-4" />
              Export both panels
            </Button>
          </div>
          {ENABLE_NEW_GRID_SYSTEM ? (
            <ComparisonGrid
              ref={splitExportRef}
              leftLabel={leftContext.label}
              rightLabel={rightContext?.label ?? "Context B"}
              left={
                <DashboardGrid
                  definition={definition}
                  widgets={dashboard.widgets}
                  layout={dashboard.layout}
                  dashboardContext={leftContext}
                  comparisonContext={rightContext}
                  compareMode={comparison.state.compareMode}
                  viewMode="split"
                  syncHover={comparison.state.syncHover}
                  chrome="panel"
                  showActions
                  layoutMode="comparison"
                  updateLayout={dashboard.updateLayout}
                  updateWidgetConfig={dashboard.updateWidgetConfig}
                  addWidget={dashboard.addWidget}
                  removeWidget={dashboard.removeWidget}
                  resetDashboard={dashboard.resetDashboard}
                />
              }
              right={
                rightContext ? (
                  <DashboardGrid
                    definition={definition}
                    widgets={dashboard.widgets}
                    layout={dashboard.layout}
                    dashboardContext={rightContext}
                    comparisonContext={leftContext}
                    compareMode={comparison.state.compareMode}
                    viewMode="split"
                    syncHover={comparison.state.syncHover}
                    chrome="panel"
                    showActions={false}
                    layoutMode="comparison"
                    updateLayout={dashboard.updateLayout}
                    updateWidgetConfig={dashboard.updateWidgetConfig}
                    addWidget={dashboard.addWidget}
                    removeWidget={dashboard.removeWidget}
                    resetDashboard={dashboard.resetDashboard}
                  />
                ) : null
              }
            />
          ) : (
            <div ref={splitExportRef} className="grid gap-px bg-slate-200 xl:grid-cols-2 dark:bg-white/10">
              {comparison.contexts.map((context, index) => (
                <section key={context.id} className="max-h-[calc(100vh-11rem)] min-h-[70vh] min-w-0 overflow-y-auto bg-slate-50 p-4 dark:bg-[#10131f]">
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
                  />
                </section>
              ))}
            </div>
          )}
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
          layoutMode="dashboard"
          updateLayout={dashboard.updateLayout}
          updateWidgetConfig={dashboard.updateWidgetConfig}
          addWidget={dashboard.addWidget}
          removeWidget={dashboard.removeWidget}
          resetDashboard={dashboard.resetDashboard}
        />
      )}
    </div>
  );
}
