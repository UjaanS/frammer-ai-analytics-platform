// Tool schemas presented to the LLM. Uses the OpenAI / Groq function-calling
// shape: `{ type: "function", function: { name, description, parameters } }`.
// Schemas are intentionally permissive (string fields are open-ended) — strict
// validation happens after the model returns, in `validateActions`. This
// keeps the prompt small while still catching hallucinations server-side.

import type Groq from "groq-sdk";

import {
  billableStatuses,
  channels,
  companies,
  inputTypes,
  outputTypes,
  platforms,
  publishedStatuses,
  qualityFlags,
  users
} from "@/lib/analytics/mock-data";
import type { NlqAction } from "./types";

const WIDGET_TYPES = ["kpi", "line-chart", "bar-chart", "pie-chart", "table", "heatmap", "ai-insight"] as const;
const QUERY_KEYS = ["summary", "timeTrend", "channelPerformance", "platformDistribution", "videoList", "qualityHeatmap", "aiInsight"] as const;
const PERSONAS = ["client", "admin", "tech"] as const;
const VIEW_MODES = ["split", "overlay"] as const;
const CONTEXT_IDS = ["context-a", "context-b"] as const;
const METRIC_MODES = ["count", "duration"] as const;
const TIME_GROUPS = ["day", "month", "year"] as const;

// Used both in the tool descriptions and in the validation step.
export const allowedValues = {
  companies: ["AAA - Frammer AI", ...companies],
  channels: ["Channel-Frammer AI", ...channels],
  users: ["all", ...users],
  videoTypes: ["all", ...inputTypes],
  outputTypes: ["all", ...outputTypes],
  publishedStatuses: ["all", ...publishedStatuses],
  billableStatuses: ["all", ...billableStatuses],
  platforms,
  qualityFlags,
  widgetTypes: WIDGET_TYPES,
  queryKeys: QUERY_KEYS,
  personas: PERSONAS,
  viewModes: VIEW_MODES,
  contextIds: CONTEXT_IDS,
  metricModes: METRIC_MODES,
  timeGroups: TIME_GROUPS
} as const;

// Internal shape — { name, description, parameters } per tool. Wrapped into
// Groq's { type: "function", function: {...} } shape below for export.
type RawTool = { name: string; description: string; parameters: Record<string, unknown> };

const rawTools: RawTool[] = [
  {
    name: "update_filters",
    description:
      "Set one or more filter values on a comparison context. Pass only the fields you want to change. " +
      "Use 'all' (or 'AAA - Frammer AI' for company / 'Channel-Frammer AI' for channel) as the wildcard 'show everything' sentinel.",
    parameters: {
      type: "object",
      properties: {
        contextId: { type: "string", enum: [...CONTEXT_IDS] },
        filters: {
          type: "object",
          properties: {
            company: { type: "string" },
            channel: { type: "string" },
            user: { type: "string" },
            videoType: { type: "string" },
            published: { type: "string" },
            comparison: { type: "string", enum: ["previous-period", "previous-month", "previous-year", "none"] },
            dimension: { type: "string", enum: ["none", "channel", "platform", "user", "team", "videoType"] },
            dimensionFilter: { type: "string", enum: ["none", "top-10", "bottom-10", "custom"] }
          },
          additionalProperties: false
        }
      },
      required: ["contextId", "filters"]
    }
  },
  {
    name: "set_date_range",
    description: "Set the start and end dates for a context. Use ISO yyyy-mm-dd format.",
    parameters: {
      type: "object",
      properties: {
        contextId: { type: "string", enum: [...CONTEXT_IDS] },
        start: { type: "string", description: "ISO date yyyy-mm-dd" },
        end: { type: "string", description: "ISO date yyyy-mm-dd" }
      },
      required: ["contextId", "start", "end"]
    }
  },
  {
    name: "set_compare_mode",
    description:
      "Toggle side-by-side / overlay comparison mode. Pass viewMode='overlay' for layered charts on one canvas, 'split' for two panels.",
    parameters: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        viewMode: { type: "string", enum: [...VIEW_MODES] }
      },
      required: ["enabled"]
    }
  },
  {
    name: "set_persona",
    description: "Switch the active dashboard persona (client | admin | tech). Each persona has its own preset widget set.",
    parameters: {
      type: "object",
      properties: {
        persona: { type: "string", enum: [...PERSONAS] }
      },
      required: ["persona"]
    }
  },
  {
    name: "add_widget",
    description:
      "Add a new widget to the dashboard. The widget is placed at the top, pushing existing widgets down. " +
      "Pick the queryKey that matches the data shape the widget needs: summary (single totals), timeTrend (time series), " +
      "channelPerformance (per-channel), platformDistribution (per-platform), videoList (record list), qualityHeatmap, aiInsight.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: [...WIDGET_TYPES] },
        queryKey: { type: "string", enum: [...QUERY_KEYS] },
        title: { type: "string" },
        config: {
          type: "object",
          properties: {
            metric: { type: "string", description: "For kpi widgets: uploaded | processed | published | downloads | publishRate | avgProcessing" },
            dimension: { type: "string" },
            metricMode: { type: "string", enum: [...METRIC_MODES] },
            timeGroup: { type: "string", enum: [...TIME_GROUPS] },
            description: { type: "string" }
          }
        }
      },
      required: ["type", "queryKey", "title"]
    }
  },
  {
    name: "remove_widget",
    description: "Hide a widget by its id (the widget can be restored from the Add Widget modal).",
    parameters: {
      type: "object",
      properties: { widgetId: { type: "string" } },
      required: ["widgetId"]
    }
  },
  {
    name: "update_widget_config",
    description: "Mutate the config of an existing widget (e.g. switch metric, timeGroup, dimension).",
    parameters: {
      type: "object",
      properties: {
        widgetId: { type: "string" },
        config: {
          type: "object",
          properties: {
            metric: { type: "string" },
            dimension: { type: "string" },
            metricMode: { type: "string", enum: [...METRIC_MODES] },
            timeGroup: { type: "string", enum: [...TIME_GROUPS] },
            description: { type: "string" }
          }
        }
      },
      required: ["widgetId", "config"]
    }
  },
  {
    name: "reset_dashboard",
    description: "Restore the current persona's default widget layout. Use when the user asks to start over.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  }
];

// Wrap each tool in Groq's expected ChatCompletionTool shape.
export const tools: Groq.Chat.ChatCompletionTool[] = rawTools.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }
}));

// Server-side validation. Runs on every action the model returns; rejects
// the whole response if anything is off. Returns null on success or an error
// message on failure.
export function validateActions(actions: NlqAction[], availableWidgetIds: string[]): string | null {
  for (const action of actions) {
    switch (action.name) {
      case "update_filters": {
        const { contextId, filters } = action.input;
        if (!CONTEXT_IDS.includes(contextId)) return `Unknown contextId: ${contextId}`;
        if (filters.company && !allowedValues.companies.includes(filters.company)) {
          return `Unknown company: ${filters.company}`;
        }
        if (filters.channel && !allowedValues.channels.includes(filters.channel)) {
          return `Unknown channel: ${filters.channel}`;
        }
        if (filters.user && !allowedValues.users.includes(filters.user)) {
          return `Unknown user: ${filters.user}`;
        }
        if (filters.videoType && !allowedValues.videoTypes.includes(filters.videoType)) {
          return `Unknown video type: ${filters.videoType}`;
        }
        if (filters.published && !allowedValues.publishedStatuses.includes(filters.published)) {
          return `Unknown publish state: ${filters.published}`;
        }
        break;
      }
      case "set_date_range": {
        const { contextId, start, end } = action.input;
        if (!CONTEXT_IDS.includes(contextId)) return `Unknown contextId: ${contextId}`;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
          return `Date range must be ISO yyyy-mm-dd; got ${start} / ${end}`;
        }
        break;
      }
      case "set_compare_mode": {
        const { viewMode } = action.input;
        if (viewMode && !VIEW_MODES.includes(viewMode)) return `Unknown viewMode: ${viewMode}`;
        break;
      }
      case "set_persona": {
        if (!PERSONAS.includes(action.input.persona)) return `Unknown persona: ${action.input.persona}`;
        break;
      }
      case "add_widget": {
        const { type, queryKey } = action.input;
        if (!WIDGET_TYPES.includes(type)) return `Unknown widget type: ${type}`;
        if (!QUERY_KEYS.includes(queryKey)) return `Unknown queryKey: ${queryKey}`;
        break;
      }
      case "remove_widget":
      case "update_widget_config": {
        if (!availableWidgetIds.includes(action.input.widgetId)) {
          return `Unknown widgetId: ${action.input.widgetId}`;
        }
        break;
      }
      case "reset_dashboard":
        break;
      default:
        return `Unknown action: ${(action as { name: string }).name}`;
    }
  }
  return null;
}
