# Phase 1: SQL Aggregation Pushdown

## Scope

This phase moves semantic KPI aggregation and warehouse explorer grouping into PostgreSQL. It does not change frontend behavior, widget metadata, API response shapes, NLQ behavior, authentication, authorization, tenant handling, styling, or host integration.

`USE_SQL_AGGREGATION=true` enables the SQL path. Set it to `false` and restart the API to use the preserved Python aggregation path.

## Aggregation Inventory

### Semantic summary widgets

Before this phase, every `summary` query loaded all videos, service requests, publish schedules, and clip-cut requests into Python. Python list comprehensions, loops, `sum`, `len`, and ratio calculations produced:

- `videosIngested`
- `generatedOutputs`
- `processingSuccessRate`
- `processingErrorRate`
- `processingBacklog`
- `processingTurnaround`
- `outputYield`
- `serviceCompletionRate`
- `serviceBacklog`
- `publishScheduleCompletionRate`
- `metadataCompleteness`
- `clipcutCompletionRate`

The SQL path now computes those values with repository-level aggregate queries. The legacy functions `build_summary` and `extend_operational_summary` remain available for rollback.

### Non-summary semantic widgets

`timeTrend`, `channelPerformance`, `platformDistribution`, and `videoList` still build their response records in Python because their existing response contracts contain record or chart series payloads. They no longer load unrelated service, publish, and clip-cut collections unless filters require those collections.

### Warehouse explorer

Before this phase, `WarehouseQueryService` filtered and grouped materialized Python dictionaries with `filter_rows`, `aggregate_rows`, `calculate_metric`, and `_rate`.

With SQL aggregation enabled, grouped metrics now execute in PostgreSQL through `AnalyticsRepository.aggregate_warehouse_query`. Raw explorer rows remain materialized to preserve the existing drilldown and export contract. The Python grouping implementation remains available for rollback.

### Filter catalog

The filter catalog still loads source collections before deriving distinct values. This is not a KPI aggregation path and remains a future optimization opportunity.

## SQL Aggregates Introduced

Repository methods:

- `get_video_summary_metrics`
- `get_service_summary_metrics`
- `get_publish_summary_metrics`
- `get_clipcut_summary_metrics`
- `aggregate_warehouse_query`

The queries use PostgreSQL:

- `COUNT(*) FILTER (WHERE ...)`
- `SUM(CASE WHEN ... THEN ... ELSE ... END)`
- `AVG`, `MIN`, and `MAX`
- `ROUND`
- `GROUP BY`
- correlated `EXISTS` filters for related video context

## Benchmark Method

Benchmarks were captured on localhost against the imported snapshot. Each number is the average of five HTTP requests to the FastAPI service. Application rows materialized are derived from the repository paths exercised by each request.

| Request | Before avg | After avg | Change | Before Python rows | After Python rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| Summary, unrestricted | 5178.71 ms | 2197.14 ms | -57.6% | 81,652 | 0 |
| Summary, Sky News | 4666.29 ms | 2101.16 ms | -55.0% | 81,652 | 0 |
| Video list, 10,000 limit | 5092.13 ms | 2696.01 ms | -47.1% | 81,652 | 6,115 |
| Videos endpoint, 10,000 limit | 2901.81 ms | 2641.39 ms | -9.0% | 6,115 | 6,115 |
| Warehouse service grouping | 5907.12 ms | 5475.48 ms | -7.3% | 81,280 | 81,280 |
| Warehouse catalog | 5010.52 ms | 4253.78 ms | -15.1% | 81,525 | 81,525 |

The summary SQL queries still scan the relevant PostgreSQL facts (`6,115` videos, `75,165` service requests, `245` schedules, and `127` clip-cut requests), but they return aggregate rows instead of materializing `81,652` ORM records in the API process.

API process memory snapshots were indicative rather than controlled heap profiles:

| Mode | Private memory | Working set |
| --- | ---: | ---: |
| Legacy process snapshot | 331.14 MB | 332.68 MB |
| SQL process snapshot | 120.72 MB | 141.24 MB |

The reliable memory result is the summary-path materialization reduction from `81,652` Python rows to `0`. Process RSS varies with process age and prior requests.

## Validation

- SQL and legacy summary paths return matching KPI counts and rates.
- SQL duration sums preserve the legacy per-row two-decimal minute rounding policy.
- SQL grouping is enabled for all seven warehouse datasets.
- Clip-cut grouping preserves the direct request-user relationship.
- Joined service search, quality drilldowns, filters, raw explorer rows, exports, and BFF contracts remain intact.

## Rollback

Set:

```text
USE_SQL_AGGREGATION=false
```

Restart the API. Summary widgets use `build_summary` and `extend_operational_summary`, and warehouse explorer grouping uses `aggregate_rows`.

