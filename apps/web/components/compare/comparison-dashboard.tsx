"use client";

import { useDashboardState } from "@/hooks/use-dashboard-state";
import { useComparisonDashboardState } from "@/hooks/use-comparison-dashboard-state";
import { ComparisonSummaryBanner } from "@/components/compare/comparison-summary-banner";
import { ComparisonToolbar } from "@/components/compare/comparison-toolbar";
import { ContextFilterPanel } from "@/components/compare/context-filter-panel";
import { DashboardGrid } from "@/components/widgets/dashboard-renderer";
import type { DashboardDefinition } from "@/lib/widgets/types";

export function ComparisonDashboard({ definition }: { definition: DashboardDefinition }) {
  const dashboard = useDashboardState(definition);
  const comparison = useComparisonDashboardState();
  const [leftContext, rightContext] = comparison.contexts;
  const shouldCompare = comparison.state.compareMode && Boolean(rightContext);

  return (
    <div className="space-y-6">
      <ComparisonToolbar
        compareMode={comparison.state.compareMode}
        compareBy={comparison.state.compareBy}
        viewMode={comparison.state.viewMode}
        syncFilters={comparison.state.syncFilters}
        onCompareModeChange={comparison.setCompareMode}
        onCompareByChange={comparison.setCompareBy}
        onViewModeChange={comparison.setViewMode}
        onSyncFiltersChange={comparison.setSyncFilters}
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
            <span className="rounded-full border border-white/10 bg-[#24283d] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400 shadow-lg shadow-black/20">
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
        <div className="grid gap-6 transition-all duration-300 2xl:grid-cols-2">
          {comparison.contexts.map((context, index) => (
            <section key={context.id} className="min-w-0 rounded-lg border border-white/10 bg-black/10 p-4">
              <DashboardGrid
                definition={definition}
                widgets={dashboard.widgets}
                layout={dashboard.layout}
                dashboardContext={context}
                comparisonContext={comparison.contexts[index === 0 ? 1 : 0]}
                compareMode={comparison.state.compareMode}
                viewMode="split"
                chrome="panel"
                showActions={index === 0}
                updateLayout={dashboard.updateLayout}
                updateWidgetConfig={dashboard.updateWidgetConfig}
                addWidget={dashboard.addWidget}
                resetDashboard={dashboard.resetDashboard}
              />
            </section>
          ))}
        </div>
      ) : (
        <DashboardGrid
          definition={definition}
          widgets={dashboard.widgets}
          layout={dashboard.layout}
          dashboardContext={leftContext}
          comparisonContext={shouldCompare ? rightContext : undefined}
          compareMode={comparison.state.compareMode}
          viewMode={comparison.state.viewMode}
          updateLayout={dashboard.updateLayout}
          updateWidgetConfig={dashboard.updateWidgetConfig}
          addWidget={dashboard.addWidget}
          resetDashboard={dashboard.resetDashboard}
        />
      )}
    </div>
  );
}
