# KPI Parity Feasibility Audit

## Scope

This audit covers the four legacy KPI cards that remained pending after the
compatibility migration. It uses the supplied `frammer.sql` snapshot, the
selective importer, the warehouse models, and the semantic SQL summary path.

The dashboard layout and warehouse query architecture are intentionally out of
scope.

## Source Evidence

The dump contains:

- `services_requested.service_type_id`
- `services_requested.status`
- `services_requested.video_id`
- `services_requested.initiated_by`
- `services_requested.video_replaced`
- generated video lineage through `videos.parent_video_id`
- generated video types through `videos.video_type`
- publish destinations through `video_publish_schedulers.platform_type`
- clipcut aspect ratios through `video_clipcut_club_requests.aspect_ratio_type`

The importer already projects service type, service status, video linkage, and
service timestamps into `fact_service_request`. It did not previously project
`video_replaced`.

## Feasibility Decisions

| KPI | Can calculate today? | Definition | Confidence | Decision |
| --- | --- | --- | --- | --- |
| Reels | Yes | Distinct linked videos with a completed `reels` service request | High | Promote |
| Shorts Videos | Yes | Distinct linked videos with a completed `shorts` service request | High | Promote |
| Replaced Videos | Yes, after importer enhancement | Distinct linked videos with any service request where `video_replaced > 0` | High | Promote |
| Videos Downloaded | Quantifiable, but not safely interpretable as the legacy KPI | See download options below | Low | Keep pending validation |

## Reels

### Source mapping

- Primary: `services_requested.service_type_id = 'reels'`
- Completion: `services_requested.status = 3`
- Grain: `services_requested.video_id`
- Supporting cross-checks: vertical clipcut ratios and destinations such as
  `facebook-reels` and `reels`

### Count logic

```text
COUNT(DISTINCT video_id)
WHERE service_type_id = 'reels'
  AND status = 3
  AND video_id IS NOT NULL
```

The source snapshot contains 545 Reels requests and 281 completed Reels
requests. Completed requests map one-to-one to 281 distinct videos.

### Assumption

A completed dedicated `reels` service request means the linked video has a
successfully generated Reels output. Publish destinations and aspect ratios are
supporting evidence only and are not used to inflate the metric.

## Shorts Videos

### Source mapping

- Primary: `services_requested.service_type_id = 'shorts'`
- Completion: `services_requested.status = 3`
- Grain: `services_requested.video_id`
- Supporting cross-checks: destinations such as `shorts` and `siteappshorts`

### Count logic

```text
COUNT(DISTINCT video_id)
WHERE service_type_id = 'shorts'
  AND status = 3
  AND video_id IS NOT NULL
```

The source snapshot contains 321 Shorts requests and 241 completed Shorts
requests. Completed requests map one-to-one to 241 distinct videos.

### Assumption

A completed dedicated `shorts` service request means the linked video has a
successfully generated Shorts output. The broader `siteappshorts` service type
is intentionally excluded because it is a separate source classification.

## Replaced Videos

### Source mapping

- Primary: `services_requested.video_replaced`
- Grain: `services_requested.video_id`
- Importer enhancement: project the source integer as
  `fact_service_request.video_replaced_count`

### Count logic

```text
COUNT(DISTINCT video_id)
WHERE video_replaced_count > 0
  AND video_id IS NOT NULL
```

The source snapshot contains five positive replacement rows on five distinct
videos. The raw positive values are `1`, `1`, `7`, `2`, and `1`, totaling
twelve replacement events.

### Assumption

The legacy KPI is named “Replaced Videos,” so it counts affected videos rather
than summing replacement events. The raw integer remains stored in the
warehouse so event-count reporting can be added later without reparsing the
dump.

## Videos Downloaded

### Source mapping

- Candidate source: `services_requested.service_type_id = 'mp4_download'`
- Candidate completion: `services_requested.status = 3`
- Grain: request row or linked `video_id`, depending on business definition

### Quantified options

| Option | Definition | Snapshot count |
| --- | --- | ---: |
| A | All `mp4_download` request rows | 6,116 |
| B | Distinct linked videos with an `mp4_download` request | 6,115 |
| C | Completed `mp4_download` action rows | 5,852 |

Completed actions map to 5,852 distinct videos in this snapshot.

### Recommendation

Keep the KPI pending validation. Option C is the closest measurable operational
definition, but the snapshot proves only that an `mp4_download` service action
completed. It does not prove that a user consumed a download, and the source
does not define whether retries should be counted as actions or deduplicated by
video. No value should be shown as “Videos Downloaded” until the product owner
chooses the business definition.

## Filter Semantics

Promoted service-backed KPIs use the existing dataset-specific service-request
date semantics and the existing related-video filter adapter. They therefore
respond to the same active dashboard filter state without introducing hidden
company, channel, tenant, date, or status restrictions.
