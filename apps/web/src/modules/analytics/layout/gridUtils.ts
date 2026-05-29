import type { LayoutMode, WidgetSchema } from "@/lib/widgets/types";
import { getWidgetGridSpan } from "./layoutConfig";

// Insert a newly-added or restored widget at the top of the grid, pushing
// every other visible widget down by the inserted widget's height so they
// don't overlap. The grid then vertically compacts via react-grid-layout's
// compactType="vertical" on the next render.
export function insertWidgetAtTop(widgets: WidgetSchema[], widgetId: string): WidgetSchema[] {
  const target = widgets.find((widget) => widget.id === widgetId);
  if (!target) return widgets;

  const span = getWidgetGridSpan(target);
  const targetPosition = {
    ...target.position,
    i: target.id,
    x: 0,
    y: 0,
    w: span.w,
    h: span.h,
    minW: span.minW,
    minH: span.minH
  };

  return widgets.map((widget) => {
    if (widget.id === widgetId) {
      return { ...widget, visible: true, position: targetPosition };
    }

    if (widget.visible === false) return widget;

    return {
      ...widget,
      position: {
        ...widget.position,
        y: widget.position.y + span.h
      }
    };
  });
}

// Auto-arrange widgets by type into a clean, predictable layout.
//
// Ordering rules:
//   1. KPIs first — packed into rows
//   2. Chart-table pairs — for each chart whose `queryKey` matches a
//      table widget's `queryKey`, place chart + table adjacently
//   3. Standalone charts
//   4. Other tables (excluding the videoList "table")
//   5. AI insight widgets
//   6. Heatmap widgets
//   7. Video list — always last, full width (queryKey === "videoList")
//
// Mode-aware: in "dashboard" mode targets a 12-col grid; in "comparison"
// mode targets a 6-col grid (narrow panel). Hidden widgets are skipped.
export function organizeWidgets(widgets: WidgetSchema[], mode: LayoutMode = "dashboard"): WidgetSchema[] {
  const TOTAL_COLS = mode === "comparison" ? 6 : 12;

  const visible = widgets.filter((widget) => widget.visible !== false);
  const hidden = widgets.filter((widget) => widget.visible === false);

  // Bucket by category (preserves relative order within each bucket).
  const kpis = visible.filter((widget) => widget.type === "kpi");
  const videoList = visible.filter((widget) => widget.type === "table" && widget.queryKey === "videoList");
  const charts = visible.filter((widget) => ["line-chart", "bar-chart", "pie-chart"].includes(widget.type));
  const otherTables = visible.filter(
    (widget) => widget.type === "table" && widget.queryKey !== "videoList"
  );
  const aiInsights = visible.filter((widget) => widget.type === "ai-insight");
  const heatmaps = visible.filter((widget) => widget.type === "heatmap");

  // Match chart -> sibling table by queryKey. A consumed table is
  // popped from `availableTables` so it's not placed twice.
  const availableTables = [...otherTables];
  const chartGroups: Array<{ chart: WidgetSchema; table: WidgetSchema | null }> = charts.map((chart) => {
    const tableIndex = availableTables.findIndex((table) => table.queryKey === chart.queryKey);
    const table = tableIndex >= 0 ? availableTables.splice(tableIndex, 1)[0] : null;
    return { chart, table };
  });

  // Position cursor — tracks current write position in the grid.
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  const placed: WidgetSchema[] = [];

  function commitRow() {
    if (cursorX > 0) {
      cursorY += rowHeight;
      cursorX = 0;
      rowHeight = 0;
    }
  }

  function place(widget: WidgetSchema, w: number, h: number) {
    const span = getWidgetGridSpan(widget);
    // If this widget would overflow the current row, wrap.
    if (cursorX + w > TOTAL_COLS) commitRow();
    placed.push({
      ...widget,
      position: {
        ...widget.position,
        i: widget.id,
        x: cursorX,
        y: cursorY,
        w,
        h,
        minW: span.minW,
        minH: span.minH
      }
    });
    cursorX += w;
    rowHeight = Math.max(rowHeight, h);
    if (cursorX >= TOTAL_COLS) commitRow();
  }

  // 1. KPIs — always sized at the absolute minimum (matches the minW=2
  // floor from getWidgetGridSpan). Organize is the user's "pack
  // everything as tightly as possible" action; KPIs go to smallest in
  // every mode. Dashboard packs 6/row; compare panel packs 3/row.
  const kpiW = 2;
  const kpiH = 2;
  for (const kpi of kpis) place(kpi, kpiW, kpiH);
  commitRow();

  // 2 + 3. Chart groups (chart + paired table or standalone).
  for (const { chart, table } of chartGroups) {
    if (table) {
      // In dashboard mode: chart 8/12 + table 4/12 on same row.
      // In comparison mode: chart 6/6 (full row), table 6/6 (next row).
      if (mode === "comparison") {
        place(chart, 6, 7);
        commitRow();
        place(table, 6, 5);
        commitRow();
      } else {
        place(chart, 8, 7);
        place(table, 4, 7);
        commitRow();
      }
    } else {
      // Standalone chart — half width in dashboard, full in compare.
      if (mode === "comparison") {
        place(chart, 6, 7);
        commitRow();
      } else {
        place(chart, 6, 6);
      }
    }
  }
  commitRow();

  // 4. Other tables that didn't match a chart.
  for (const table of availableTables) {
    place(table, mode === "comparison" ? 6 : 12, 5);
    commitRow();
  }

  // 5. AI insights — half-width.
  for (const ai of aiInsights) {
    place(ai, mode === "comparison" ? 6 : 6, 4);
  }
  commitRow();

  // 6. Heatmaps — half-width.
  for (const heatmap of heatmaps) {
    place(heatmap, mode === "comparison" ? 6 : 6, 6);
  }
  commitRow();

  // 7. Video list — always last, always full width.
  for (const video of videoList) {
    place(video, TOTAL_COLS, 7);
    commitRow();
  }

  // Hidden widgets keep their (irrelevant) positions; concatenate so
  // they're not lost from the dashboard state.
  return [...placed, ...hidden];
}
