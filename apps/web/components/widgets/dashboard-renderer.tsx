"use client";

import { RotateCcw } from "lucide-react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";

import { AddWidgetModal } from "@/components/widgets/add-widget-modal";
import { WidgetRenderer } from "@/components/widgets/widget-registry";
import { Button } from "@/components/ui/button";
import { useDashboardState } from "@/hooks/use-dashboard-state";
import type { DashboardContext, DashboardDefinition, ComparisonViewMode, WidgetConfig, WidgetSchema } from "@/lib/widgets/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

type DashboardRendererProps = {
  definition: DashboardDefinition;
  dashboardContext: DashboardContext;
  comparisonContext?: DashboardContext;
  compareMode?: boolean;
  viewMode?: ComparisonViewMode;
  chrome?: "full" | "panel";
  showActions?: boolean;
};

export function DashboardRenderer({
  definition,
  dashboardContext,
  comparisonContext,
  compareMode = false,
  viewMode = "split",
  chrome = "full",
  showActions = true
}: DashboardRendererProps) {
  const { widgets, layout, updateLayout, updateWidgetConfig, addWidget, resetDashboard } = useDashboardState(definition);

  return (
    <DashboardGrid
      definition={definition}
      widgets={widgets}
      layout={layout}
      dashboardContext={dashboardContext}
      comparisonContext={comparisonContext}
      compareMode={compareMode}
      viewMode={viewMode}
      chrome={chrome}
      showActions={showActions}
      updateLayout={updateLayout}
      updateWidgetConfig={updateWidgetConfig}
      addWidget={addWidget}
      resetDashboard={resetDashboard}
    />
  );
}

export function DashboardGrid({
  definition,
  widgets,
  layout,
  dashboardContext,
  comparisonContext,
  compareMode = false,
  viewMode = "split",
  chrome = "full",
  showActions = true,
  updateLayout,
  updateWidgetConfig,
  addWidget,
  resetDashboard
}: {
  definition: DashboardDefinition;
  widgets: WidgetSchema[];
  layout: Layout[];
  dashboardContext: DashboardContext;
  comparisonContext?: DashboardContext;
  compareMode?: boolean;
  viewMode?: ComparisonViewMode;
  chrome?: "full" | "panel";
  showActions?: boolean;
  updateLayout: (layout: Layout[]) => void;
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  addWidget: (widget: WidgetSchema) => void;
  resetDashboard: () => void;
}) {
  const visibleWidgets = widgets.filter((widget) => widget.visible !== false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {chrome === "full" ? (
            <>
              <span>Home</span>
              <span>/</span>
            </>
          ) : null}
          <span className="font-semibold text-slate-300">{definition.title}</span>
          <span className="rounded-full bg-white/[0.07] px-2 py-1 text-xs font-bold text-slate-300">{dashboardContext.label}</span>
        </div>
        {showActions ? (
          <div className="flex flex-wrap gap-2">
            <AddWidgetModal onAddWidget={addWidget} />
            <Button variant="outline" className="border-white/10 bg-[#24283d] text-slate-200 hover:bg-[#2d3147]" onClick={resetDashboard}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Layout
            </Button>
          </div>
        ) : null}
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        margin={[18, 18]}
        containerPadding={[0, 0]}
        draggableHandle=".widget-drag-handle"
        draggableCancel="button,input,select,textarea,a,.widget-interactive,[role='button']"
        onLayoutChange={updateLayout}
      >
        {visibleWidgets.map((widget) => (
          <div key={widget.id} className="min-w-0 overflow-hidden">
            <div className="h-full min-h-0 overflow-hidden rounded-lg">
              <WidgetRenderer
                widget={widget}
                context={{
                  dashboardContext,
                  comparisonContext,
                  compareMode,
                  viewMode,
                  setWidgetConfig: updateWidgetConfig
                }}
              />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
