# Routing Structure

## Frontend

```text
/
  redirects to /dashboard

/(dashboard)
  shared authenticated dashboard layout

/(dashboard)/executive-summary
  executive KPI, insight, anomaly, funnel, trend, channel, and multi-dimensional summary

/(dashboard)/usage-trends
  usage trend analysis with count/duration toggles, grouping, and comparison mode

/(dashboard)/channel-user-analytics
  channel rankings, user contribution, language, platform, and performer drilldown sections

/(dashboard)/content-analytics
  output mix, input trends, stacked charts, heatmap, treemap, and dimensional pivots

/(dashboard)/publishing-funnel
  uploaded to processed to published to downloaded conversion and latency analysis

/(dashboard)/data-quality
  missing fields, duplicate IDs, invalid URLs, unknown mappings, failed jobs, and quality score

/(dashboard)/video-explorer
  searchable, sortable, paginated, export-ready video record explorer

/(dashboard)/reports
  legacy report module entry point

/(dashboard)/settings
  legacy settings module entry point

/api/health
  frontend runtime health check

/api/mock/overview
  mock executive analytics payload

/api/mock/videos
  mock video records payload

/api/mock/filters
  mock filter options payload
```

## Backend

```text
/health
  process health

/api/v1/health
  versioned API health endpoint
```

Business routes should be added under `apps/api/app/api/v1/endpoints` and included from `apps/api/app/api/v1/router.py`.
