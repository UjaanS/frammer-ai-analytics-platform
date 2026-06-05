"use client";

import { RotateCcw, Wand2 } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";

import { AddWidgetModal } from "@/components/widgets/add-widget-modal";
import { WarehouseInvestigationDialog } from "@/components/analytics/warehouse-investigation-dialog";
import { WidgetRenderer } from "@/components/widgets/widget-registry";
import { Button } from "@/components/ui/button";
import { useDashboardState } from "@/hooks/use-dashboard-state";
import { cn } from "@/lib/utils";
import { dashboardGridDensity } from "@/src/modules/analytics/layout";
import type {
  ComparisonViewMode,
  DashboardContext,
  DashboardDefinition,
  LayoutMode,
  WidgetConfig,
  WidgetSchema
} from "@/lib/widgets/types";
import type { WarehouseQueryRequest } from "@/lib/analytics/warehouse";

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

type SemanticWidgetGroup = "kpi" | "charts" | "video-list";

const SEMANTIC_WIDGET_GROUP_LABELS: Record<SemanticWidgetGroup, string> = {
  kpi: "KPIs",
  charts: "Charts and tables",
  "video-list": "Videos"
};

const SEMANTIC_GROUP_BORDER_STYLES: Record<SemanticWidgetGroup, string> = {
  kpi: "border-amber-300/25 bg-amber-50/[0.035] text-amber-700 dark:border-amber-300/15 dark:bg-amber-300/[0.025] dark:text-amber-100",
  charts: "border-sky-300/25 bg-sky-50/[0.035] text-sky-700 dark:border-sky-300/15 dark:bg-sky-300/[0.025] dark:text-sky-100",
  "video-list": "border-violet-300/25 bg-violet-50/[0.035] text-violet-700 dark:border-violet-300/15 dark:bg-violet-300/[0.025] dark:text-violet-100"
};

function getSemanticWidgetGroup(widget: WidgetSchema): SemanticWidgetGroup {
  if (widget.type === "kpi") return "kpi";
  if (widget.type === "warehouse-explorer" || widget.queryKey === "videoList") return "video-list";
  return "charts";
}

type SemanticGroupBoundary = {
  group: SemanticWidgetGroup;
  top: number;
  left: number;
  width: number;
  height: number;
};

const FULL_GRID_CONTAINER_PADDING: [number, number] = [20, 40];
const PANEL_GRID_CONTAINER_PADDING: [number, number] = [12, 36];
const FULL_GRID_MARGIN: [number, number] = [GRID_MARGIN[0], 52];
const PANEL_GRID_MARGIN: [number, number] = [GRID_MARGIN[0], 48];

function groupBoundariesAreEqual(previous: SemanticGroupBoundary[], next: SemanticGroupBoundary[]) {
  if (previous.length !== next.length) return false;
  return previous.every((item, index) => {
    const compare = next[index];
    return (
      item.group === compare.group &&
      item.top === compare.top &&
      item.left === compare.left &&
      item.width === compare.width &&
      item.height === compare.height
    );
  });
}

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
  const [investigation, setInvestigation] = useState<WarehouseQueryRequest>();

  return (
    <>
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
      organizeDashboard={dashboard.organizeDashboard}
      openInvestigation={setInvestigation}
      />
      <WarehouseInvestigationDialog query={investigation} onClose={() => setInvestigation(undefined)} />
    </>
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
  layoutMode?: LayoutMode;
  updateLayout: (layout: Layout[]) => void;
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  addWidget: (widget: WidgetSchema) => void;
  removeWidget: (widgetId: string) => void;
  resetDashboard: () => void;
  organizeDashboard: () => void;
  openInvestigation?: (query: WarehouseQueryRequest) => void;
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
  resetDashboard,
  organizeDashboard,
  openInvestigation
}: DashboardGridProps) {
  const visibleWidgets = useMemo(
    () => widgets.filter((widget) => widget.visible !== false),
    [widgets]
  );
  const hiddenWidgets = useMemo(
    () => widgets.filter((widget) => widget.visible === false),
    [widgets]
  );
  const gridShellRef = useRef<HTMLDivElement | null>(null);
  const [groupBoundaries, setGroupBoundaries] = useState<SemanticGroupBoundary[]>([]);
  const semanticGridPadding = chrome === "panel" ? PANEL_GRID_CONTAINER_PADDING : FULL_GRID_CONTAINER_PADDING;
  const semanticGridMargin = chrome === "panel" ? PANEL_GRID_MARGIN : FULL_GRID_MARGIN;

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

  const measureGroupBoundaries = useCallback(() => {
    const gridShell = gridShellRef.current;
    if (!gridShell) return;

    const shellRect = gridShell.getBoundingClientRect();
    const boundaryPadding = semanticGridPadding[0];
    const nextBoundaries = (["kpi", "charts", "video-list"] as SemanticWidgetGroup[])
      .map((group) => {
        const items = Array.from(
          gridShell.querySelectorAll<HTMLElement>(`[data-semantic-group="${group}"]`)
        );
        if (!items.length) return null;

        const rects = items.map((item) => item.getBoundingClientRect());
        const top =
          Math.min(...rects.map((rect) => rect.top)) -
          shellRect.top -
          boundaryPadding;
        const left =
          Math.min(...rects.map((rect) => rect.left)) -
          shellRect.left -
          boundaryPadding;
        const right = Math.max(...rects.map((rect) => rect.right)) - shellRect.left + boundaryPadding;
        const bottom = Math.max(...rects.map((rect) => rect.bottom)) - shellRect.top + boundaryPadding;

        return {
          group,
          top: Math.max(0, Math.round(top)),
          left: Math.max(0, Math.round(left)),
          width: Math.max(0, Math.round(right - left)),
          height: Math.max(0, Math.round(bottom - top))
        } satisfies SemanticGroupBoundary;
      })
      .filter((boundary): boundary is SemanticGroupBoundary => Boolean(boundary));

    setGroupBoundaries((previous) =>
      groupBoundariesAreEqual(previous, nextBoundaries) ? previous : nextBoundaries
    );
  }, [semanticGridPadding]);

  const scheduleGroupBoundaryMeasurement = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(measureGroupBoundaries);
    });
    window.setTimeout(measureGroupBoundaries, 150);
    window.setTimeout(measureGroupBoundaries, 500);
  }, [measureGroupBoundaries]);

  useLayoutEffect(() => {
    scheduleGroupBoundaryMeasurement();

    const gridShell = gridShellRef.current;
    if (!gridShell) return undefined;

    const observer = new ResizeObserver(scheduleGroupBoundaryMeasurement);
    observer.observe(gridShell);

    window.addEventListener("resize", scheduleGroupBoundaryMeasurement);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleGroupBoundaryMeasurement);
    };
  }, [layout, scheduleGroupBoundaryMeasurement, visibleWidgets]);

  // Persist + nudge charts on user-driven layout changes. We use
  // onDragStop / onResizeStop (instead of onLayoutChange) so we only write
  // localStorage once per user action — onLayoutChange fires continuously
  // during drag and causes state churn.
  const handleLayoutChange = useCallback(
    (nextLayout: Layout[]) => {
      updateLayout(nextLayout);
      notifyChartsOfResize();
      scheduleGroupBoundaryMeasurement();
    },
    [notifyChartsOfResize, scheduleGroupBoundaryMeasurement, updateLayout]
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
              onClick={organizeDashboard}
              title="Auto-arrange widgets by type"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Organize
            </Button>
            <Button
              variant="outline"
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#24283d] dark:text-slate-200 dark:hover:bg-[#2d3147]"
              onClick={resetDashboard}
              title="Restore the preset layout"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Default Layout
            </Button>
          </div>
        ) : null}
      </div>

      <div ref={gridShellRef} className="relative" data-semantic-grid-shell="true">
        <div className="pointer-events-none absolute inset-0 z-0">
          {groupBoundaries.map((boundary) => (
            <div
              key={boundary.group}
              className={cn(
                "absolute rounded-2xl border border-dashed transition-all duration-150",
                SEMANTIC_GROUP_BORDER_STYLES[boundary.group]
              )}
              style={{
                top: boundary.top,
                left: boundary.left,
                width: boundary.width,
                height: boundary.height
              }}
              data-semantic-boundary={boundary.group}
              aria-hidden="true"
            />
          ))}
        </div>
        <ResponsiveGridLayout
          className="layout relative z-10"
          layouts={responsiveLayouts}
          breakpoints={GRID_BREAKPOINTS}
          cols={GRID_COLUMNS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={semanticGridMargin}
          containerPadding={semanticGridPadding}
          draggableHandle=".widget-drag-handle"
          draggableCancel={DRAGGABLE_CANCEL}
          resizeHandles={["se"]}
          compactType="vertical"
          preventCollision={false}
          isBounded
          useCSSTransforms
          onLayoutChange={scheduleGroupBoundaryMeasurement}
          onDragStop={handleLayoutChange}
          onResizeStop={handleLayoutChange}
          onBreakpointChange={() => {
            notifyChartsOfResize();
            scheduleGroupBoundaryMeasurement();
          }}
        >
          {visibleWidgets.map((widget) => {
            const semanticGroup = getSemanticWidgetGroup(widget);

            return (
              // Direct DOM children — react-grid-layout cloneElement injects
              // className / style / event handlers / resize-handle children here.
              // Keep this element a plain <div>; do not wrap in a memoized component
              // unless it forwards every RGL prop, otherwise positioning breaks.
              <div
                key={widget.id}
                className="min-w-0"
                data-semantic-group={semanticGroup}
                aria-label={`${SEMANTIC_WIDGET_GROUP_LABELS[semanticGroup]} group widget: ${widget.title}`}
              >
                <WidgetRenderer
                  widget={widget}
                  context={{
                    dashboardContext,
                    comparisonContext,
                    compareMode,
                    viewMode,
                    syncHover,
                    setWidgetConfig: updateWidgetConfig,
                    removeWidget,
                    openInvestigation
                  }}
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
