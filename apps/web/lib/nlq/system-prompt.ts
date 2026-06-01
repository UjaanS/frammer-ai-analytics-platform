// System prompt builder. Parameterized by current dashboard state so the
// model knows exactly which widgets exist and what filter values are valid.
// Keep the prompt small — concrete enums + a current-state summary, no
// rambling.

import { allowedValuesForWarehouse } from "./tools";
import type { NlqContextSnapshot } from "./types";

export function buildSystemPrompt(state: NlqContextSnapshot, warehouseFilters?: Record<string, string[]>): string {
  const allowedValues = allowedValuesForWarehouse(warehouseFilters);
  const contextSummary = state.contexts
    .map((ctx) => {
      const filters = Object.entries(ctx.filters)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      return `  ${ctx.id} ("${ctx.label}"): ${ctx.dateRange.start} to ${ctx.dateRange.end} | ${filters}`;
    })
    .join("\n");

  return `You are the natural-language assistant for the Frammer analytics dashboard.
Your job is to translate the user's request into a sequence of tool calls that update the dashboard.

## Current state

Persona: ${state.persona}
Compare mode: ${state.compareMode ? "on" : "off"} (view: ${state.viewMode})
Active contexts:
${contextSummary}
Widget ids currently in the dashboard:
${state.widgetIds.length ? state.widgetIds.map((id) => `  - ${id}`).join("\n") : "  (none)"}

## Allowed values

These enums are strict — server-side validation will reject any value not in these lists.

- companies: ${allowedValues.companies.join(", ")}
- channels: ${allowedValues.channels.join(", ")}
- users: ${allowedValues.users.join(", ")}
- languages: ${allowedValues.languages.join(", ")}
- videoTypes (filter values): ${allowedValues.videoTypes.join(", ")}
- serviceTypes: ${allowedValues.serviceTypes.join(", ")}
- sourcePlatforms: ${allowedValues.sourcePlatforms.join(", ")}
- publishPlatforms: ${allowedValues.publishPlatforms.join(", ")}
- statuses: ${allowedValues.statuses.join(", ")}
- publishedStatuses (filter values): ${allowedValues.publishedStatuses.join(", ")}
- personas: ${allowedValues.personas.join(", ")}
- widget types: ${allowedValues.widgetTypes.join(", ")}
- widget queryKeys: ${allowedValues.queryKeys.join(", ")}
- viewModes: ${allowedValues.viewModes.join(", ")}
- metric values for KPI widgets: uploaded, processed, published, downloads, publishRate, avgProcessing
- canonical semantic metrics: ${allowedValues.semanticMetrics.join(", ")}
- canonical semantic dimensions: ${allowedValues.semanticDimensions.join(", ")}

## Rules

1. Always use tool calls — never reply with plain text describing what you would do.
2. Use the "all" sentinel to clear / widen any filter back to "show everything".
3. For comparison requests (e.g. "compare LinkedIn vs Instagram"), enable compare mode and set both contexts' filters accordingly.
4. For widget creation, pick the smallest correct queryKey and include config.metricId / config.dimensionIds when a canonical semantic mapping exists.
5. Source platform and publish platform are separate dimensions. Do not merge them.
6. Treat the warehouse catalog as authoritative. Use any imported dataset or semantic metric needed by the question.
7. After tool calls, provide a one-sentence summary in the final text response describing what changed in plain English. Keep it under 100 characters.
8. If the user's request is ambiguous or references something that doesn't exist (e.g. a fictional channel), still attempt the closest valid action and explain in the summary.
9. If the request truly cannot be mapped to any action, respond with no tool calls and a brief explanation as text.
`;
}
