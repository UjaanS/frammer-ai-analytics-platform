# Project Structure

```text
analytics-platform/
  apps/
    web/
      app/
        (dashboard)/
          executive-summary/
          usage-trends/
          channel-user-analytics/
          content-analytics/
          publishing-funnel/
          data-quality/
          video-explorer/
        api/
          health/
      components/
        analytics/
        charts/
        data-table/
        feedback/
        filters/
        layout/
        shell/
        theme/
        ui/
        video/
      config/
      hooks/
      lib/
        analytics/
    api/
      app/
        api/
          v1/
            endpoints/
        core/
        db/
        models/
        schemas/
        services/
      tests/
  packages/
    shared/
      src/
  docs/
    architecture/
```

## Boundaries

- `apps/web/app`: Route definitions and page-level composition.
- `apps/web/components/layout`: Product shell and navigation.
- `apps/web/components/ui`: ShadCN-style primitives.
- `apps/web/components/charts`: Reusable Recharts composition.
- `apps/web/components/filters`: URL-synced analytics filter engine UI.
- `apps/web/components/analytics`: KPI cards, insight cards, page wrappers, and multi-dimensional analytics panels.
- `apps/web/components/data-table`: TanStack Table wrapper components.
- `apps/web/lib/analytics`: Mock data, filter parsing, aggregation, and reusable analytics engine.
- `apps/api/app/api`: HTTP routing boundaries.
- `apps/api/app/core`: Configuration and application settings.
- `apps/api/app/db`: Database engine/session setup.
- `apps/api/app/services`: Business service boundary, intentionally empty for now.
