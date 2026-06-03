// Tool schemas presented to the LLM. Uses the OpenAI / Groq function-calling
// shape: `{ type: "function", function: { name, description, parameters } }`.
// Schemas are intentionally permissive (string fields are open-ended) — strict
// validation happens after the model returns, in `validateActions`. This
// keeps the prompt small while still catching hallucinations server-side.

import type Groq from "groq-sdk";

import type { NlqAction } from "./types";
import { semanticDimensions, semanticMetrics } from "@/lib/analytics/semantic-catalog";

const WIDGET_TYPES = ["kpi", "line-chart", "bar-chart", "pie-chart", "table", "funnel-chart", "warehouse-explorer", "heatmap", "ai-insight"] as const;
const QUERY_KEYS = ["summary", "timeTrend", "channelPerformance", "platformDistribution", "videoList", "qualityHeatmap", "aiInsight"] as const;
const PERSONAS = ["client", "admin", "tech"] as const;
const VIEW_MODES = ["split", "overlay"] as const;
const CONTEXT_IDS = ["context-a", "context-b"] as const;
const METRIC_MODES = ["count", "duration"] as const;
const TIME_GROUPS = ["day", "month", "year"] as const;
const SEMANTIC_METRICS = semanticMetrics.filter((metric) => metric.available).map((metric) => metric.id);
const WAREHOUSE_DATASETS = ["videos", "serviceRequests", "publishSchedules", "clipcutRequests", "trendingSnapshots", "lineage", "qualityIssues"] as const;
const WAREHOUSE_AGGREGATIONS = ["count", "sum", "avg", "min", "max", "rate"] as const;

// Used both in the tool descriptions and in the validation step.
export const allowedValues = {
  companies: ["all"],
  channels: ["all"],
  users: ["all"],
  languages: ["all"],
  videoTypes: ["all"],
  serviceTypes: ["all"],
  sourcePlatforms: ["all"],
  publishPlatforms: ["all"],
  statuses: ["all"],
  publishedStatuses: ["all", "Published", "Scheduled", "Draft", "Failed"],
  widgetTypes: WIDGET_TYPES,
  queryKeys: QUERY_KEYS,
  personas: PERSONAS,
  viewModes: VIEW_MODES,
  contextIds: CONTEXT_IDS,
  metricModes: METRIC_MODES,
  timeGroups: TIME_GROUPS,
  semanticMetrics: SEMANTIC_METRICS,
  semanticDimensions,
  warehouseDatasets: WAREHOUSE_DATASETS,
  warehouseAggregations: WAREHOUSE_AGGREGATIONS
} as const;

// Internal shape — { name, description, parameters } per tool. Wrapped into
// Groq's { type: "function", function: {...} } shape below for export.
type RawTool = { name: string; description: string; parameters: Record<string, unknown> };

const rawTools: RawTool[] = [
  {
    name: "update_filters",
    description:
      "Set one or more filter values on a comparison context. Pass only the fields you want to change. " +
      "Use 'all' as the wildcard 'show everything' sentinel.",
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
            language: { type: "string" },
            videoType: { type: "string" },
            serviceType: { type: "string" },
            sourcePlatform: { type: "string" },
            publishPlatform: { type: "string" },
            status: { type: "string" },
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
      "channelPerformance (grouped categories), platformDistribution (per-platform), videoList (record list), qualityHeatmap, aiInsight. " +
      "For warehouse-backed charts, tables, funnels, and explorers include config.warehouseQuery.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: [...WIDGET_TYPES] },
        queryKey: { type: "string", enum: [...QUERY_KEYS] },
        title: { type: "string" },
        config: {
          type: "object",
          properties: {
            metric: { type: "string", description: "Legacy compatibility alias. Prefer metricId for new KPI widgets." },
            metricId: { type: "string", enum: [...SEMANTIC_METRICS], description: "Canonical semantic metric id. Prefer this for SQL-backed metrics." },
            dimension: { type: "string" },
            dimensionIds: { type: "array", items: { type: "string", enum: [...semanticDimensions] } },
            metricMode: { type: "string", enum: [...METRIC_MODES] },
            timeGroup: { type: "string", enum: [...TIME_GROUPS] },
            description: { type: "string" }
            ,
            warehouseQuery: warehouseQuerySchema()
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
            metricId: { type: "string", enum: [...SEMANTIC_METRICS] },
            dimension: { type: "string" },
            dimensionIds: { type: "array", items: { type: "string", enum: [...semanticDimensions] } },
            metricMode: { type: "string", enum: [...METRIC_MODES] },
            timeGroup: { type: "string", enum: [...TIME_GROUPS] },
            description: { type: "string" }
            ,
            warehouseQuery: warehouseQuerySchema()
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
  },
  {
    name: "open_explorer",
    description: "Open the warehouse explorer for a record-level investigation using a dataset, filters, grouping, and metrics.",
    parameters: {
      type: "object",
      properties: {
        query: warehouseQuerySchema()
      },
      required: ["query"]
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
export function validateActions(
  actions: NlqAction[],
  availableWidgetIds: string[],
  warehouseFilters?: Record<string, string[]>
): string | null {
  const values = allowedValuesForWarehouse(warehouseFilters);
  for (const action of actions) {
    switch (action.name) {
      case "update_filters": {
        const { contextId, filters } = action.input;
        if (!CONTEXT_IDS.includes(contextId)) return `Unknown contextId: ${contextId}`;
        if (filters.company && !values.companies.includes(filters.company)) {
          return `Unknown company: ${filters.company}`;
        }
        if (filters.channel && !values.channels.includes(filters.channel)) {
          return `Unknown channel: ${filters.channel}`;
        }
        if (filters.user && !values.users.includes(filters.user)) {
          return `Unknown user: ${filters.user}`;
        }
        if (filters.language && !values.languages.includes(filters.language)) {
          return `Unknown language: ${filters.language}`;
        }
        if (filters.videoType && !values.videoTypes.includes(filters.videoType)) {
          return `Unknown video type: ${filters.videoType}`;
        }
        if (filters.serviceType && !values.serviceTypes.includes(filters.serviceType)) {
          return `Unknown service type: ${filters.serviceType}`;
        }
        if (filters.sourcePlatform && !values.sourcePlatforms.includes(filters.sourcePlatform)) {
          return `Unknown source platform: ${filters.sourcePlatform}`;
        }
        if (filters.publishPlatform && !values.publishPlatforms.includes(filters.publishPlatform)) {
          return `Unknown publish platform: ${filters.publishPlatform}`;
        }
        if (filters.status && !values.statuses.includes(filters.status)) {
          return `Unknown status: ${filters.status}`;
        }
        if (filters.published && !(allowedValues.publishedStatuses as readonly string[]).includes(filters.published)) {
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
        const { type, queryKey, config } = action.input;
        if (!WIDGET_TYPES.includes(type)) return `Unknown widget type: ${type}`;
        if (!QUERY_KEYS.includes(queryKey)) return `Unknown queryKey: ${queryKey}`;
        const configError = validateSemanticConfig(config);
        if (configError) return configError;
        break;
      }
      case "remove_widget":
      case "update_widget_config": {
        if (!availableWidgetIds.includes(action.input.widgetId)) {
          return `Unknown widgetId: ${action.input.widgetId}`;
        }
        if (action.name === "update_widget_config") {
          const configError = validateSemanticConfig(action.input.config);
          if (configError) return configError;
        }
        break;
      }
      case "reset_dashboard":
        break;
      case "open_explorer":
        if (!WAREHOUSE_DATASETS.includes(action.input.query.dataset)) {
          return `Unknown warehouse dataset: ${action.input.query.dataset}`;
        }
        break;
      default:
        return `Unknown action: ${(action as { name: string }).name}`;
    }
  }
  return null;
}

export function allowedValuesForWarehouse(filters?: Record<string, string[]>) {
  const withAll = (values?: string[]) => ["all", ...Array.from(new Set(values ?? [])).filter((value) => value !== "all")];
  return {
    ...allowedValues,
    companies: withAll(filters?.companies),
    channels: withAll(filters?.channels),
    users: withAll(filters?.users),
    languages: withAll(filters?.languages),
    videoTypes: withAll(filters?.videoTypes),
    serviceTypes: withAll(filters?.serviceTypes),
    sourcePlatforms: withAll(filters?.sourcePlatforms),
    publishPlatforms: withAll(filters?.publishPlatforms),
    statuses: withAll([...(filters?.videoStatuses ?? []), ...(filters?.serviceStatuses ?? [])])
  };
}

function validateSemanticConfig(config?: { metricId?: string; dimensionIds?: string[]; warehouseQuery?: { dataset: string } }): string | null {
  if (config?.metricId && !SEMANTIC_METRICS.includes(config.metricId as (typeof SEMANTIC_METRICS)[number])) {
    return `Unknown semantic metric: ${config.metricId}`;
  }
  const unknownDimension = config?.dimensionIds?.find(
    (dimension) => !semanticDimensions.includes(dimension as (typeof semanticDimensions)[number])
  );
  if (unknownDimension) return `Unknown semantic dimension: ${unknownDimension}`;
  if (config?.warehouseQuery && !WAREHOUSE_DATASETS.includes(config.warehouseQuery.dataset as (typeof WAREHOUSE_DATASETS)[number])) {
    return `Unknown warehouse dataset: ${config.warehouseQuery.dataset}`;
  }
  return null;
}

function warehouseQuerySchema() {
  return {
    type: "object",
    properties: {
      dataset: { type: "string", enum: [...WAREHOUSE_DATASETS] },
      groupBy: { type: "array", items: { type: "string" } },
      metrics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            aggregation: { type: "string", enum: [...WAREHOUSE_AGGREGATIONS] }
          },
          required: ["id", "aggregation"]
        }
      },
      fixedDimensionFilters: { type: "object", additionalProperties: { type: "string" } },
      sortBy: { type: "string" },
      sortDirection: { type: "string", enum: ["asc", "desc"] },
      limit: { type: "number" }
    },
    required: ["dataset", "metrics"]
  };
}
