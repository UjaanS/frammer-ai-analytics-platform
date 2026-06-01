# SQL-Backed Analytics Integration

## Preservation Contract

The analytics warehouse is additive. Existing UI behavior remains owned by the current
metadata-driven widget system:

- `useWidgetData` remains the widget fetch boundary.
- Widget metadata, query keys, persona presets, layout storage keys, resize behavior,
  drag behavior, restore behavior, expanded views, KPI overlays, comparison layouts,
  exports, and NLQ actions remain compatible.
- `/api/analytics/widget-data` is the new same-origin BFF route.
- `/api/mock/widget-data` remains a compatibility alias.
- `ANALYTICS_DATA_MODE=mock|sql|fallback` controls rollout. Production defaults to
  `sql`; local development defaults to `fallback`.

## Source ERD

```text
company.id ~> channel.company_id
company.id ~> videos.company_id
channel.id ~> videos.channel_id
users.id ~> videos.user_id
videos.id ~> videos.parent_video_id
videos.id ~> services_requested.video_id
videos.id ~> md_child_metadata.video_id
videos.video_md5 ~> video_publish_schedulers.video_id
video_clipcut_club_requests.request_id
  => video_clipcut_club_request_details.request_id
```

Only the clip-cut detail relationship is enforced in the source dump. Other joins are
soft relationships and are audited during ingestion.

## Warehouse Lineage

| Source | Analytics mart | Notes |
|---|---|---|
| `company`, `channel`, `users` | `dim_company`, `dim_channel`, `dim_user` | Names and source status only |
| `videos` | `fact_video` | Original and generated asset lifecycle |
| `services_requested` | `fact_service_request` | One video and service request |
| `video_publish_schedulers` | `fact_publish_schedule` | Publish platform normalized with `trim()` |
| `video_clipcut_club_requests` | `fact_clipcut_request` | Clip-cut lifecycle |
| `trendings` | `fact_trending_snapshot` | Trend item and snapshot date |
| `videos.parent_video_id` | `bridge_video_lineage` | Parent-child output relationship |
| `md_child_metadata` | Boolean flags on `fact_video` | Content is not persisted |

Credentials, tokens, emails, descriptions, raw request bodies, raw API responses, and
generated metadata text are intentionally excluded from the analytics warehouse.

## Semantic Policies

- `videosIngested` counts original assets only.
- Generated children feed `generatedOutputs` and `outputYield`.
- Deleted videos are excluded by default.
- Unknown raw statuses remain visible as `unknown(<value>)`; they are recorded as
  data-quality issues and excluded from classified success/error denominators.
- Source platform and publish platform remain separate dimensions.
- Downloads, views, revenue, and credit consumption remain registered but unavailable
  until a trustworthy source exists.

## Known Snapshot Issues

- Orphan company and channel references exist in source videos and role mappings.
- Sentinel zero IDs exist in service requests, profiles, and scheduler channel values.
- Video statuses `5` and `10`, service statuses `5` and `7`, and published values `3`
  and `4` are undocumented.
- Publish platform contains whitespace drift for `facebook-reels`.
- Stored `credits_used` values are zero across the supplied dump.
- Live-cut durations use minutes while standard video durations use seconds.
- Trend snapshots are stale and several operational tables are empty.

## Snapshot Load

Run migrations and load a snapshot:

```bash
alembic -c apps/api/alembic.ini upgrade head
python -m apps.api.app.ingestion.frammer_snapshot --file C:/path/to/frammer.sql
```

The loader is checksum-idempotent and records counts, completion time, and quality
issues in `analytics_load_run` and `analytics_data_quality_issue`.
