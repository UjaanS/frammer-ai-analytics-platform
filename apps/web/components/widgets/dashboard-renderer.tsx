"use client";

import { RotateCcw } from "lucide-react";
import { memo, useEffect, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";

import { AddWidgetModal } from "@/components/widgets/add-widget-modal";
import { WidgetRenderer } from "@/components/widgets/widget-registry";
import { Button } from "@/components/ui/button";
import { useDashboardState } from "@/hooks/use-dashboard-state";
import {
  dashboardGridDensity,
  ENABLE_NEW_GRID_SYSTEM,
  normalizeWidgetLayouts,
  useAnalyticsLayoutStore,
  type AnalyticsLayoutMode
} from "@/src/modules/analytics/layout";
import type { DashboardContext, DashboardDefinition, ComparisonViewMode, WidgetConfig, WidgetSchema } from "@/lib/widgets/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

type DashboardRendererProps = {
  definition: DashboardDefinition;
  dashboardContext: DashboardContext;
  comparisonContext?: DashboardContext;
  compareMode?: boolean;
  viewMode?: ComparisonViewMode;
  syncHover?: boolean;
  chrome?: "full" | "panel";
  showActions?: boolean;
  layoutMode?: AnalyticsLayoutMode;
};

export function DashboardRenderer({
  definition,
  dashboardContext,
  comparisonContext,
  compareMode = false,
  viewMode = "split",
  syncHover = true,
  chrome = "full",
  showActions = true,
  layoutMode = "dashboard"
}: DashboardRendererProps) {
  const { widgets, layout, updateLayout, updateWidgetConfig, addWidget, removeWidget, resetDashboard } = useDashboardState(definition);

  return (
    <DashboardGrid
      definition={definition}
      widgets={widgets}
      layout={layout}
      dashboardContext={dashboardContext}
      comparisonContext={comparisonContext}
      compareMode={compareMode}
      viewMode={viewMode}
      syncHover={syncHover}
      chrome={chrome}
      showActions={showActions}
      layoutMode={layoutMode}
      updateLayout={updateLayout}
      updateWidgetConfig={updateWidgetConfig}
      addWidget={addWidget}
      removeWidget={removeWidget}
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
  syncHover = true,
  chrome = "full",
  showActions = true,
  layoutMode = "dashboard",
  updateLayout,
  updateWidgetConfig,
  addWidget,
  removeWidget,
  resetDashboard
}: {
  definition: DashboardDefinition;
  widgets: WidgetSchema[];
  layout: Layout[];
  dashboardContext: DashboardContext;
  comparisonContext?: DashboardContext;
  compareMode?: boolean;
  viewMode?: ComparisonViewMode;
  syncHover?: boolean;
  chrome?: "full" | "panel";
  showActions?: boolean;
  layoutMode?: AnalyticsLayoutMode;
  updateLayout: (layout: Layout[]) => void;
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  addWidget: (widget: WidgetSchema) => void;
  removeWidget: (widgetId: string) => void;
  resetDashboard: () => void;
}) {
  const visibleWidgets = widgets.filter((widget) => widget.visible !== false);
  const hiddenWidgets = widgets.filter((widget) => widget.visible === false);
  const setLayoutMode = useAnalyticsLayoutStore((state) => state.setLayoutMode);
  const setStoredLayout = useAnalyticsLayoutStore((state) => state.setLayout);
  const activeLayout = useMemo(
    () => (ENABLE_NEW_GRID_SYSTEM ? normalizeWidgetLayouts(visibleWidgets, layoutMode) : layout),
    [layout, layoutMode, visibleWidgets]
  );
  const density = ENABLE_NEW_GRID_SYSTEM ? dashboardGridDensity.compact : dashboardGridDensity.legacy;
  const breakpoints = ENABLE_NEW_GRID_SYSTEM
    ? { lg: 1200, md: 768, sm: 480, xs: 320, xxs: 0 }
    : { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
  const columns = ENABLE_NEW_GRID_SYSTEM
    ? { lg: 12, md: 6, sm: 1, xs: 1, xxs: 1 }
    : { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };

  useEffect(() => {
    if (!ENABLE_NEW_GRID_SYSTEM) return;
    setLayoutMode(definition.id, layoutMode);
    setStoredLayout(definition.id, activeLayout);
  }, [activeLayout, definition.id, layoutMode, setLayoutMode, setStoredLayout]);

  return (
    <div className={ENABLE_NEW_GRID_SYSTEM ? "space-y-4" : "space-y-5"}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
            <AddWidgetModal
              onAddWidget={addWidget}
              hiddenWidgets={hiddenWidgets}
              onRestoreWidget={(widgetId) => {
                const widget = widgets.find((item) => item.id === widgetId);
                if (widget) addWidget(widget);
              }}
            />
            <Button variant="outline" className="border-white/10 bg-[#24283d] text-slate-200 hover:bg-[#2d3147]" onClick={resetDashboard}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Layout
            </Button>
          </div>
        ) : null}
      </div>

      {ENABLE_NEW_GRID_SYSTEM ? (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: activeLayout, md: activeLayout, sm: activeLayout, xs: activeLayout, xxs: activeLayout }}
          breakpoints={breakpoints}
          cols={columns}
          rowHeight={density.rowHeight}
          margin={density.margin}
          containerPadding={[0, 0]}
          draggableHandle=".widget-drag-handle"
          draggableCancel="button,input,select,textarea,a,.widget-interactive,[role='button']"
          onLayoutChange={updateLayout}
        >
          {visibleWidgets.map((widget) => (
            <WidgetGridItem
              key={widget.id}
              widget={widget}
              dashboardContext={dashboardContext}
              comparisonContext={comparisonContext}
              compareMode={compareMode}
              viewMode={viewMode}
              syncHover={syncHover}
              updateWidgetConfig={updateWidgetConfig}
              removeWidget={removeWidget}
            />
          ))}
        </ResponsiveGridLayout>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
          {[...visibleWidgets]
            .sort((first, second) => (first.position.y * 100 + first.position.x) - (second.position.y * 100 + second.position.x))
            .map((widget) => (
              <div
                key={widget.id}
                className={getLegacyGridColumnClass(widget.position.w)}
                style={{ order: finiteOrder(widget.position.y, widget.position.x) }}
              >
                <WidgetGridItem
                  widget={widget}
                  dashboardContext={dashboardContext}
                  comparisonContext={comparisonContext}
                  compareMode={compareMode}
                  viewMode={viewMode}
                  syncHover={syncHover}
                  updateWidgetConfig={updateWidgetConfig}
                  removeWidget={removeWidget}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const WidgetGridItem = memo(function WidgetGridItem({
  widget,
  dashboardContext,
  comparisonContext,
  compareMode,
  viewMode,
  syncHover,
  updateWidgetConfig,
  removeWidget
}: {
  widget: WidgetSchema;
  dashboardContext: DashboardContext;
  comparisonContext?: DashboardContext;
  compareMode: boolean;
  viewMode: ComparisonViewMode;
  syncHover: boolean;
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  removeWidget: (widgetId: string) => void;
}) {
  const rendererContext = useMemo(
    () => ({
      dashboardContext,
      comparisonContext,
      compareMode,
      viewMode,
      syncHover,
      setWidgetConfig: updateWidgetConfig,
      removeWidget
    }),
    [compareMode, comparisonContext, dashboardContext, removeWidget, syncHover, updateWidgetConfig, viewMode]
  );

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="h-full min-h-0 overflow-hidden rounded-lg">
        <WidgetRenderer widget={widget} context={rendererContext} />
      </div>
    </div>
  );
});

function getLegacyGridColumnClass(width: number) {
  if (width <= 2) return "md:col-span-3 xl:col-span-2";
  if (width <= 3) return "md:col-span-3 xl:col-span-3";
  if (width <= 4) return "md:col-span-6 xl:col-span-4";
  if (width <= 6) return "md:col-span-6 xl:col-span-6";
  if (width <= 8) return "md:col-span-6 xl:col-span-8";
  return "md:col-span-6 xl:col-span-12";
}

function finiteOrder(y: number, x: number) {
  const safeY = Number.isFinite(y) ? y : 0;
  const safeX = Number.isFinite(x) ? x : 0;
  return safeY * 100 + safeX;
}
