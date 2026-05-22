# Metadata-Driven Widget System

The Frammer analytics dashboard now renders from widget metadata instead of hardcoded dashboard sections.

## Folder Structure

```text
apps/web/
  components/
    analytics/
      frammer-simple-dashboard.tsx
    widgets/
      add-widget-modal.tsx
      dashboard-renderer.tsx
      widget-chrome.tsx
      widget-controls.tsx
      widget-primitives.tsx
      widget-registry.tsx
  hooks/
    use-dashboard-state.ts
  lib/
    widgets/
      dashboard-data.ts
      dashboard-presets.ts
      types.ts
```

## Widget Schema

Each widget is described as metadata:

```ts
{
  id: string,
  type: "kpi" | "line-chart" | "bar-chart" | "pie-chart" | "table" | "heatmap" | "ai-insight",
  title: string,
  queryKey: string,
  filters: {},
  size: "sm" | "md" | "lg" | "xl",
  position: { i, x, y, w, h },
  visible: true,
  config: {
    metric,
    dimension,
    metricMode,
    timeGroup,
    columns
  }
}
```

## Extension Points

- Add a new widget type in `types.ts`.
- Add a renderer in `widget-registry.tsx`.
- Add a query adapter in `dashboard-data.ts`.
- Add default dashboard metadata in `dashboard-presets.ts`.
- Replace mock query adapters with backend SQL API calls behind `queryKey`.

## NLQ Path

Natural-language queries should return widget metadata, not JSX. For example:

```json
{
  "type": "bar-chart",
  "title": "Published videos by channel",
  "queryKey": "channelPerformance",
  "config": {
    "metric": "published",
    "dimension": "channel",
    "metricMode": "count"
  }
}
```

The renderer can then add that generated widget through the same `AddWidgetModal` / `addWidget` flow.
