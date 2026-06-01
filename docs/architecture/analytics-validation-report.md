# Analytics Validation Report

## Existing Features Preserved

- Metadata-driven KPI, chart, table, video-list, heatmap, and AI insight widgets
- Dynamic add, remove, restore, organize, move, resize, and default-layout workflows
- Persona-specific saved layouts
- Split comparison, overlay comparison, synced hover, URL comparison state, and exports
- KPI overlays, expanded widgets, navigation, styling, animations, and responsiveness
- Existing NLQ actions and generated widget metadata

## New Analytics Components

- Postgres warehouse marts and dimensions
- Checksum-idempotent selective SQL snapshot importer
- Load audit and data-quality issue tables
- Repository and semantic metric service layers
- FastAPI analytics endpoints and same-origin Next.js BFF
- Mock, SQL, and explicit fallback data modes
- SQL-first record adapter for Content Analytics, Channel & User Analytics, Data Quality,
  Publishing Funnel, and Video Explorer route-level panels

## Executed Validation

- `npm run typecheck`
- `npm run build`
- `npm run api:test`: 6 tests passed
- Alembic upgrade to `20260601_0001 (head)`
- Supplied dump loaded twice with the same checksum and existing load-run result
- Warehouse row counts checked against the source profile:
  `6115` videos, `75165` service requests, `245` publish schedules, `127`
  clipcut requests, `191` trending snapshots, and `3084` lineage rows
- `298` data-quality issues captured during import
- Warehouse schema checked for credential, token, email, and raw payload columns
- FastAPI analytics endpoints exercised against the populated local warehouse
- Next BFF widget route exercised in SQL mode, including typed unavailable metadata
  for unsupported downloads
- Next BFF video route exercised with `limit=10000`: `4858` active, non-deleted
  records returned from the `6115`-row warehouse snapshot

## Remaining Production Gates

1. Run the complete Playwright workflow matrix in both `mock` and `sql` modes.
2. Replace remaining static presentation copy and chart fixtures incrementally where a
   trustworthy SQL metric exists.
3. Ground NLQ allowed filter values dynamically from semantic filter metadata.
4. Add authentication and tenant authorization before exposing production tenant data.
