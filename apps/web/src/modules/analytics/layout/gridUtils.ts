import type { WidgetSchema } from "@/lib/widgets/types";
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
