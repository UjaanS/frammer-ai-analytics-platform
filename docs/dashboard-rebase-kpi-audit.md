# Dashboard Rebase KPI and Restriction Audit

## Purpose

This audit records the SQL-backed truth boundary for the executive persona dashboard
rebase. The rebase preserves the existing dashboard framework while replacing
mock-era reporting assumptions with metrics supported by the imported warehouse.

## KPI Audit

| Metric | Current behavior | Support | Rebase decision |
| --- | --- | --- | --- |
| Videos Ingested | Counts original videos | Supported | Keep as `videosIngested` |
| Generated Outputs | Counts non-original child videos | Supported | Keep as `generatedOutputs` |
| Output Yield | Generated outputs divided by ingested originals | Supported | Keep as `outputYield` |
| Processing Backlog | Original videos in `not_started` or `in_progress` | Supported | Keep as `processingBacklog` |
| Processing Turnaround | Processing minutes divided by all originals | Partial | Average non-null duration for completed originals only |
| Service Completion Rate | Completed requests divided by classified requests | Supported | Keep as `serviceCompletionRate` |
| Service Backlog | Requests in `queued` or `in_progress` | Supported | Keep as `serviceBacklog` |
| Average Service Latency | Not exposed | Supported | Average non-null duration for completed service requests |
| Service Error Rate | Not exposed | Supported | Error requests divided by classified `done` or `error` requests |
| Service Error Volume | Not exposed | Supported | Count errored service requests |
| Stuck Jobs Over 24h | Not exposed | Supported | Count queued or in-progress services older than 24 hours |
| Publish Throughput | Published video compatibility count | Partial | Count completed publish schedules by scheduled time |
| Publish Platform Health | Not exposed | Supported | Schedule completion rate grouped by publish platform |
| Metadata Completeness | Present generated metadata fields divided by possible fields | Supported | Keep as `metadataCompleteness` |
| Recorded Quality Issues | Quality issues can accumulate across imports | Partial | Count findings from the latest completed warehouse load |
| Downloads / Download Rate | SQL adapter returns zero or unavailable metadata | Unsupported | Remove from active UI; retain typed unavailable registration |
| Views | No trustworthy source | Unsupported | Retain typed unavailable registration only |
| Revenue | No trustworthy source | Unsupported | Remove from active UI; retain typed unavailable registration |
| Credits / Billing | Inactive or unsuitable source fields | Unsupported | Remove from active UI; retain typed unavailable registration |

## Restrictions Removed By This Rebase

- Persona presets contain Downloads-era KPI cards and video-only charts.
- Comparison summary ranks Downloads as a meaningful delta.
- Add Widget and NLQ suggestions expose unsupported legacy KPI names.
- KPI detail charts assume upload, processing, or publishing video series.
- Recent Videos displays a downloaded field populated with zeroes.
- Warehouse Explorer owns internal state and cannot receive dashboard investigation seeds.
- `v7` stored widget definitions override matching defaults and preserve stale cards.

## Time And Filter Policy

- Dashboard defaults remain unrestricted: no company, channel, tenant, date, or
  status filter is injected unless the user chooses one.
- Video ingest metrics use video ingest time.
- Completed processing metrics use processing completion data.
- Service operational metrics use service completion time where available, with
  request creation time as the fallback for open work.
- Publishing metrics use schedule time.
- Dataset-specific metrics apply only filters meaningful to that dataset.
- Source platform and publish platform remain distinct dimensions.

## Compatibility Boundary

- Legacy widget query keys remain accepted.
- Unsupported metrics remain catalogued as typed unavailable values.
- Persona preset IDs advance from `v7` to `v8`; old local-storage keys are left
  untouched for rollback.
- Secondary route designs remain unchanged and are covered by regression checks.
