import type { ReactNode } from "react";

import type { WidgetSchema, WidgetType } from "@/lib/widgets/types";

export type RegisteredWidgetRenderer = (widget: WidgetSchema) => ReactNode;

export type LayoutWidgetRegistry = Partial<Record<WidgetType, RegisteredWidgetRenderer>>;

export function resolveWidgetRenderer(registry: LayoutWidgetRegistry, widget: WidgetSchema) {
  return registry[widget.type];
}
