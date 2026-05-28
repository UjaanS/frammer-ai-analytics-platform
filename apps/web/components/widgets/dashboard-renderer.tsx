"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";

import { AddWidgetModal } from "@/components/widgets/add-widget-modal";
import { WidgetRenderer } from "@/components/widgets/widget-registry";
import { Button } from "@/components/ui/button";
import { useDashboardState } from "@/hooks/use-dashboard-state";
import { dashboardGridDensity } from "@/src/modules/analytics/layout";
import type {
  ComparisonViewMode,
  DashboardContext,
  DashboardDefinition,
  WidgetConfig,
  WidgetSchema
} from "@/lib/widgets/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Single, explicit grid config — no flags, no branching.
const GRID_BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const GRID_COLUMNS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };
const { rowHeight: GRID_ROW_HEIGHT, margin: GRID_MARGIN } = dashboardGridDensity.compact;

// Drag is initiated from elements matching `.widget-drag-handle`.
// Any descendant matching `draggableCancel` aborts drag — these are the
// interactive zones that must remain clickable inside a drag handle.
const DRAGGABLE_CANCEL =
  "button,input,select,textarea,a,.widget-interactive,[role='button'],[data-widget-control='true']";

type DashboardRendererProps = {
  definition: DashboardDefinition;
  dashboardContext: DashboardContext;
  comparisonContext?: DashboardContext;
  compareMode?: boolean;
  viewMode?: ComparisonViewMode;
  syncHover?: boolean;
  chrome?: "full" | "panel";
  showActions?: boolean;
};

export function DashboardRenderer({
  definition,
  dashboardContext,
  comparisonContext,
  compareMode = false,
  viewMode = "split",
  syncHover = true,
  chrome = "full",
  showActions = true
}: DashboardRendererProps) {
  const dashboard = useDashboardState(definition);

  return (
    <DashboardGrid
      definition={definition}
      widgets={dashboard.widgets}
      layout={dashboard.layout}
      dashboardContext={dashboardContext}
      comparisonContext={comparisonContext}
      compareMode={compareMode}
      viewMode={viewMode}
      syncHover={syncHover}
      chrome={chrome}
      showActions={showActions}
      updateLayout={dashboard.updateLayout}
      updateWidgetConfig={dashboard.updateWidgetConfig}
      addWidget={dashboard.addWidget}
      removeWidget={dashboard.removeWidget}
      resetDashboard={dashboard.resetDashboard}
    />
  );
}

export type DashboardGridProps = {
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
  updateLayout: (layout: Layout[]) => void;
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  addWidget: (widget: WidgetSchema) => void;
  removeWidget: (widgetId: string) => void;
  resetDashboard: () => void;
};

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
  updateLayout,
  updateWidgetConfig,
  addWidget,
  removeWidget,
  resetDashboard
}: DashboardGridProps) {
  const visibleWidgets = useMemo(
    () => widgets.filter((widget) => widget.visible !== false),
    [widgets]
  );
  const hiddenWidgets = useMemo(
    () => widgets.filter((widget) => widget.visible === false),
    [widgets]
  );

  // ResponsiveGridLayout expects a per-breakpoint layouts map. We use the
  // same layout for every breakpoint; RGL handles reflow when the container
  // shrinks below a breakpoint by clamping items to the breakpoint's cols.
  const responsiveLayouts = useMemo(
    () => ({
      lg: layout,
      md: layout,
      sm: layout,
      xs: layout,
      xxs: layout
    }),
    [layout]
  );

  // Charts (Recharts ResponsiveContainer) measure their parent via
  // ResizeObserver on mount. RGL drives drag/resize purely with CSS
  // transforms, which doesn't trigger ResizeObserver on the chart canvas.
  // After a drag/resize/breakpoint settles, fire a window resize event so
  // chart libraries remeasure. Double-RAF defers the dispatch until after
  // RGL's own layout work has settled.
  const notifyChartsOfResize = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
  }, []);

  // Persist + nudge charts on user-driven layout changes. We use
  // onDragStop / onResizeStop (instead of onLayoutChange) so we only write
  // localStorage once per user action — onLayoutChange fires continuously
  // during drag and causes state churn.
  const handleLayoutChange = useCallback(
    (nextLayout: Layout[]) => {
      updateLayout(nextLayout);
      notifyChartsOfResize();
    },
    [notifyChartsOfResize, updateLayout]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {chrome === "full" ? (
            <>
              <span>Home</span>
              <span>/</span>
            </>
          ) : null}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{definition.title}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-white/[0.07] dark:text-slate-300">
            {dashboardContext.label}
          </span>
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
            <Button
              variant="outline"
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#24283d] dark:text-slate-200 dark:hover:bg-[#2d3147]"
              onClick={resetDashboard}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Layout
            </Button>
          </div>
        ) : null}
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={responsiveLayouts}
        breakpoints={GRID_BREAKPOINTS}
        cols={GRID_COLUMNS}
        rowHeight={GRID_ROW_HEIGHT}
        margin={GRID_MARGIN}
        containerPadding={[0, 0]}
        draggableHandle=".widget-drag-handle"
        draggableCancel={DRAGGABLE_CANCEL}
        resizeHandles={["se"]}
        compactType="vertical"
        preventCollision={false}
        isBounded
        useCSSTransforms
        onDragStop={handleLayoutChange}
        onResizeStop={handleLayoutChange}
        onBreakpointChange={notifyChartsOfResize}
      >
        {visibleWidgets.map((widget) => (
          // Direct DOM children — react-grid-layout cloneElement injects
          // className / style / event handlers / resize-handle children here.
          // Keep this element a plain <div>; do not wrap in a memoized component
          // unless it forwards every RGL prop, otherwise positioning breaks.
          <div key={widget.id} className="min-w-0">
            <WidgetRenderer
              widget={widget}
              context={{
                dashboardContext,
                comparisonContext,
                compareMode,
                viewMode,
                syncHover,
                setWidgetConfig: updateWidgetConfig,
                removeWidget
              }}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
