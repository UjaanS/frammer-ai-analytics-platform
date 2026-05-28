// Client-side dispatcher: walks a validated list of NlqActions and calls the
// matching dashboard / comparison hook methods. Pure function — receives the
// bound hook methods so it stays decoupled from React component state.

import type { ComparisonViewMode, DateRange, ReportFilterState, WidgetConfig, WidgetSchema } from "@/lib/widgets/types";
import type { Persona } from "@/lib/widgets/dashboard-presets";
import type { NlqAction } from "./types";

export type ApplyHandlers = {
  updateContextFilters: (contextId: string, filters: Partial<ReportFilterState>) => void;
  updateContextDateRange: (contextId: string, dateRange: DateRange) => void;
  setCompareMode: (enabled: boolean) => void;
  setViewMode: (viewMode: ComparisonViewMode) => void;
  setPersona: (persona: Persona) => void;
  addWidget: (widget: WidgetSchema) => void;
  removeWidget: (widgetId: string) => void;
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  resetDashboard: () => void;
};

export function applyNlqActions(actions: NlqAction[], handlers: ApplyHandlers): void {
  for (const action of actions) {
    switch (action.name) {
      case "update_filters":
        handlers.updateContextFilters(action.input.contextId, action.input.filters);
        break;

      case "set_date_range":
        handlers.updateContextDateRange(action.input.contextId, {
          start: action.input.start,
          end: action.input.end
        });
        break;

      case "set_compare_mode":
        handlers.setCompareMode(action.input.enabled);
        if (action.input.viewMode) handlers.setViewMode(action.input.viewMode);
        break;

      case "set_persona":
        handlers.setPersona(action.input.persona);
        break;

      case "add_widget": {
        const span = defaultSpanForType(action.input.type);
        const id = `nlq-${action.input.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const widget: WidgetSchema = {
          id,
          type: action.input.type,
          title: action.input.title,
          queryKey: action.input.queryKey,
          size: span.w <= 3 ? "sm" : span.w <= 6 ? "md" : "lg",
          position: { i: id, x: 0, y: 0, w: span.w, h: span.h, minW: span.minW, minH: span.minH },
          visible: true,
          config: action.input.config ?? {}
        };
        handlers.addWidget(widget);
        break;
      }

      case "remove_widget":
        handlers.removeWidget(action.input.widgetId);
        break;

      case "update_widget_config":
        handlers.updateWidgetConfig(action.input.widgetId, action.input.config);
        break;

      case "reset_dashboard":
        handlers.resetDashboard();
        break;

      default:
        // Exhaustiveness check — TypeScript will error here if a new action
        // type is added without a handler.
        ((_x: never) => _x)(action);
    }
  }
}

// Same shape `insertWidgetAtTop` uses for fresh widgets. Kept here as a
// local copy so the client dispatcher doesn't import server-side modules.
function defaultSpanForType(type: WidgetSchema["type"]) {
  if (type === "kpi") return { w: 3, h: 2, minW: 2, minH: 2 };
  if (type === "table") return { w: 12, h: 7, minW: 6, minH: 5 };
  if (type === "ai-insight") return { w: 6, h: 4, minW: 3, minH: 3 };
  return { w: 6, h: 6, minW: 3, minH: 5 };
}
