// Shared types between the /api/nlq route and the client apply-action loop.

import type { Persona } from "@/lib/widgets/dashboard-presets";
import type { ReportFilterState } from "@/lib/widgets/types";

export type NlqContextSnapshot = {
  persona: Persona;
  compareMode: boolean;
  viewMode: "split" | "overlay";
  contexts: Array<{
    id: string;
    label: string;
    filters: ReportFilterState;
    dateRange: { start: string; end: string };
  }>;
  widgetIds: string[];
};

export type NlqRequest = {
  query: string;
  state: NlqContextSnapshot;
};

// Every action the model can request. Mirrors the tool names below.
export type NlqAction =
  | {
      name: "update_filters";
      input: {
        contextId: "context-a" | "context-b";
        filters: Partial<ReportFilterState>;
      };
    }
  | {
      name: "set_date_range";
      input: { contextId: "context-a" | "context-b"; start: string; end: string };
    }
  | {
      name: "set_compare_mode";
      input: { enabled: boolean; viewMode?: "split" | "overlay" };
    }
  | {
      name: "set_persona";
      input: { persona: Persona };
    }
  | {
      name: "add_widget";
      input: {
        type: "kpi" | "line-chart" | "bar-chart" | "pie-chart" | "table" | "heatmap" | "ai-insight";
        queryKey: "summary" | "timeTrend" | "channelPerformance" | "platformDistribution" | "videoList" | "qualityHeatmap" | "aiInsight";
        title: string;
        config?: { metric?: string; dimension?: string; metricMode?: "count" | "duration"; timeGroup?: "day" | "month" | "year"; description?: string };
      };
    }
  | {
      name: "remove_widget";
      input: { widgetId: string };
    }
  | {
      name: "update_widget_config";
      input: { widgetId: string; config: { metric?: string; dimension?: string; metricMode?: "count" | "duration"; timeGroup?: "day" | "month" | "year"; description?: string } };
    }
  | {
      name: "reset_dashboard";
      input: Record<string, never>;
    };

export type NlqResponse =
  | { ok: true; summary: string; actions: NlqAction[] }
  | { ok: false; error: string };
