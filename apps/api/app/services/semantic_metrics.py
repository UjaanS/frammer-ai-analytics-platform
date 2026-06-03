from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from apps.api.app.models.analytics import FactClipcutRequest, FactPublishSchedule, FactServiceRequest, FactVideo
from apps.api.app.core.config import settings
from apps.api.app.repositories.analytics import AnalyticsRepository


UNAVAILABLE_METRICS = {
    "downloads": "The SQL snapshot does not contain trustworthy download totals.",
    "views": "The SQL snapshot does not contain view totals.",
    "revenue": "The SQL snapshot does not contain a trustworthy revenue source.",
    "creditConsumption": "Stored credits_used values are inactive in the supplied snapshot.",
}

PENDING_VALIDATION_METRICS = {
    "videosDownloaded": "Completed mp4_download service requests exist, but retries and unique-video counting rules require business validation.",
}

METRIC_CATALOG = [
    ("uploaded", "Original videos uploaded", True),
    ("processed", "Completed original videos", True),
    ("published", "Published videos", True),
    ("reels", "Distinct videos with completed Reels service requests", True),
    ("chapters", "Generated chapter videos", True),
    ("shortsVideos", "Distinct videos with completed Shorts service requests", True),
    ("mkmVideos", "Generated My Key Moments videos", True),
    ("viralVideos", "Generated viral videos", True),
    ("replacedVideos", "Distinct videos with recorded replacement events", True),
    ("nonBillableVideos", "Videos marked as non-billable", True),
    ("videosDownloaded", PENDING_VALIDATION_METRICS["videosDownloaded"], False),
    ("videosIngested", "Original videos ingested", True),
    ("generatedOutputs", "Generated child video outputs", True),
    ("processingSuccessRate", "Completed original videos / classified originals", True),
    ("processingErrorRate", "Errored original videos / classified originals", True),
    ("processingBacklog", "Original videos not started or in progress", True),
    ("processingTurnaround", "Average processing completion time in minutes", True),
    ("outputYield", "Generated child outputs / original videos", True),
    ("serviceCompletionRate", "Completed service requests / classified service requests", True),
    ("serviceBacklog", "Queued or in-progress service requests", True),
    ("averageServiceLatency", "Average completed service request latency in minutes", True),
    ("serviceErrorRate", "Errored service requests / classified service requests", True),
    ("serviceErrorVolume", "Errored service requests", True),
    ("stuckServiceJobs24h", "Queued or in-progress service requests older than 24 hours", True),
    ("publishScheduleCompletionRate", "Completed schedules / classified schedules", True),
    ("publishThroughput", "Completed publish schedules", True),
    ("publishPlatformHealth", "Publish schedule completion rate by platform", True),
    ("metadataCompleteness", "Generated metadata completeness", True),
    ("recordedQualityIssues", "Data-quality issues recorded by the latest completed load", True),
    ("clipcutCompletionRate", "Completed clip-cut requests / classified clip-cut requests", True),
    ("downloads", UNAVAILABLE_METRICS["downloads"], False),
    ("views", UNAVAILABLE_METRICS["views"], False),
    ("revenue", UNAVAILABLE_METRICS["revenue"], False),
    ("creditConsumption", UNAVAILABLE_METRICS["creditConsumption"], False),
]

LEGACY_METRIC_ALIASES = {
    "uploaded": "videosIngested",
    "processed": "processingSuccessCount",
    "published": "publishedVideos",
    "publishRate": "publishRate",
    "avgProcessing": "processingTurnaround",
    "duration": "durationMinutes",
    "processing": "processingTurnaround",
    "downloads": "downloads",
}


@dataclass
class SemanticResult:
    data: Any
    meta: dict[str, Any]


class SemanticAnalyticsService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self.repository = repository

    async def widget_query(self, query_key: str, config: dict[str, Any], context: dict[str, Any] | None) -> SemanticResult:
        unavailable = unavailable_for_config(config)
        pending_validation = pending_validation_for_config(config)
        meta = await self._meta(unavailable, pending_validation)
        if query_key == "summary" and settings.use_sql_aggregation:
            return SemanticResult(await self.repository.get_summary_metrics(context), meta)
        if settings.use_sql_aggregation and query_key in {"timeTrend", "channelPerformance", "platformDistribution"}:
            if query_key == "timeTrend":
                return SemanticResult(
                    await self.repository.get_time_trend(context, config.get("timeGroup", "day")),
                    {**meta, "aggregation": "sql", "canonicalQuery": _canonical_query("videos", ["date"], config, context)},
                )
            if query_key == "channelPerformance":
                return SemanticResult(
                    await self.repository.get_channel_performance(context),
                    {**meta, "aggregation": "sql", "canonicalQuery": _canonical_query("videos", ["channel"], config, context)},
                )
            return SemanticResult(
                await self.repository.get_platform_distribution(context),
                {**meta, "aggregation": "sql", "canonicalQuery": _canonical_query("videos", ["channel", "sourcePlatform"], config, context)},
            )
        if query_key == "qualityHeatmap":
            issues = await self.repository.list_quality_issues()
            return SemanticResult(build_quality_heatmap(issues), meta)
        if query_key == "aiInsight":
            return SemanticResult(
                {
                    "title": "SQL-backed analytics insight",
                    "body": "Semantic metrics are available through the warehouse. NLQ can add compatible metadata-driven widgets.",
                },
                meta,
            )

        rows = await self.repository.list_videos()
        needs_summary = query_key == "summary"
        services = await self.repository.list_services() if needs_summary or _requires_service_rows(context) else []
        schedules = await self.repository.list_publish_schedules() if needs_summary or _requires_schedule_rows(context) else []
        clipcuts = await self.repository.list_clipcut_requests() if needs_summary else []
        records = [
            legacy_video_record(row)
            for row in self._filter_video_rows(rows, context, services, schedules)
        ]

        if query_key == "summary":
            selected_video_ids = {record["sourceVideoId"] for record in records}
            selected_video_md5s = {record["videoMd5"] for record in records}
            has_filters = _has_active_filters(context)
            return SemanticResult(
                extend_operational_summary(
                    build_summary(records),
                    [
                        service
                        for service in services
                        if _matches_related_service(service, context, selected_video_ids, has_filters)
                    ],
                    [
                        schedule
                        for schedule in schedules
                        if _matches_related_schedule(schedule, context, selected_video_md5s, has_filters)
                    ],
                    [
                        clipcut
                        for clipcut in clipcuts
                        if _matches_related_clipcut(clipcut, context, selected_video_md5s, has_filters)
                    ],
                    records,
                ),
                meta,
            )
        if query_key == "timeTrend":
            return SemanticResult(build_time_rows(records, config.get("timeGroup", "day")), meta)
        if query_key == "channelPerformance":
            return SemanticResult(build_channel_rows(records), meta)
        if query_key == "platformDistribution":
            return SemanticResult(build_platform_rows(records), meta)
        if query_key == "videoList":
            return SemanticResult(records[: int(config.get("rowsLimit", 10))], meta)
        return SemanticResult(
            {
                "title": "SQL-backed analytics insight",
                "body": "Semantic metrics are available through the warehouse. NLQ can add compatible metadata-driven widgets.",
            },
            meta,
        )

    async def videos(self, limit: int = 500) -> SemanticResult:
        records = [legacy_video_record(row) for row in await self.repository.list_videos()]
        return SemanticResult(records[:limit], await self._meta({}))

    async def _meta(self, unavailable: dict[str, str], pending_validation: dict[str, str] | None = None) -> dict[str, Any]:
        latest = await self.repository.latest_load_run()
        return {
            "source": "sql",
            "availability": "unavailable" if unavailable or pending_validation else "available",
            "asOf": latest.finished_at.isoformat() if latest and latest.finished_at else None,
            "unavailableMetrics": unavailable,
            "pendingValidationMetrics": pending_validation or {},
        }

    def _filter_video_rows(
        self,
        rows: list[dict],
        context: dict[str, Any] | None,
        services: list[FactServiceRequest],
        schedules: list[FactPublishSchedule],
    ) -> list[dict]:
        if not context:
            return rows
        filters = context.get("filters", {})
        range_value = context.get("dateRange", {})
        start = _date(range_value.get("start"))
        end = _date(range_value.get("end"))
        service_type = filters.get("serviceType")
        publish_platform = filters.get("publishPlatform")
        service_video_ids = {
            service.video_source_id
            for service in services
            if service.video_source_id is not None and _matches(service_type, service.service_type)
        }
        scheduled_video_md5s = {
            schedule.video_md5
            for schedule in schedules
            if _matches(publish_platform, schedule.publish_platform)
        }

        def matches(row: dict) -> bool:
            video: FactVideo = row["video"]
            if start and video.date_added.date() < start:
                return False
            if end and video.date_added.date() > end:
                return False
            if not _matches(filters.get("company"), row["company_name"]):
                return False
            if not _matches(filters.get("channel"), row["channel_name"]):
                return False
            if not _matches(filters.get("user"), row["user_name"]):
                return False
            if not _matches(filters.get("language"), video.language or "unknown"):
                return False
            if not _matches(filters.get("videoType"), video.video_type):
                return False
            if not _matches(filters.get("sourcePlatform"), video.source_url_type or "unknown"):
                return False
            if not _matches(filters.get("status"), video.status_label):
                return False
            if service_type not in {None, "", "all"} and video.source_id not in service_video_ids:
                return False
            if publish_platform not in {None, "", "all"} and video.video_md5 not in scheduled_video_md5s:
                return False
            if not _matches(filters.get("published"), publish_status(video)):
                return False
            if filters.get("includeDeleted") is False and video.is_deleted:
                return False
            return True

        return [row for row in rows if matches(row)]


def metric_catalog() -> list[dict[str, Any]]:
    return [
        {
            "id": metric_id,
            "description": description,
            "available": available,
            "status": "pending_validation" if metric_id in PENDING_VALIDATION_METRICS else "available" if available else "unavailable",
        }
        for metric_id, description, available in METRIC_CATALOG
    ]


def unavailable_for_config(config: dict[str, Any]) -> dict[str, str]:
    requested = config.get("metricId") or config.get("metric")
    canonical = LEGACY_METRIC_ALIASES.get(requested, requested)
    reason = UNAVAILABLE_METRICS.get(canonical)
    return {str(requested): reason} if requested and reason else {}


def pending_validation_for_config(config: dict[str, Any]) -> dict[str, str]:
    requested = config.get("metricId") or config.get("metric")
    canonical = LEGACY_METRIC_ALIASES.get(requested, requested)
    reason = PENDING_VALIDATION_METRICS.get(canonical)
    return {str(requested): reason} if requested and reason else {}


def legacy_video_record(row: dict) -> dict[str, Any]:
    video: FactVideo = row["video"]
    duration_minutes = round((video.duration_seconds or 0) / 60, 2)
    processing_minutes = round((video.total_time_taken_seconds or 0) / 60, 2)
    return {
        "id": f"VID-{video.source_id:05d}",
        "sourceVideoId": video.source_id,
        "videoMd5": video.video_md5,
        "title": video.headline or video.filename or f"Video {video.source_id}",
        "company": row["company_name"],
        "channel": row["channel_name"],
        "user": row["user_name"],
        "team": "Unknown",
        "language": video.language or "Unknown",
        "platform": video.source_url_type or "Unknown",
        "publishedStatus": publish_status(video),
        "processingStatus": video.status_label,
        "inputType": (video.source_url_type or "unknown").replace("_", " ").title(),
        "outputType": video.video_type.replace("_", " ").title(),
        "billableStatus": "Billable" if video.is_billable else "Non-billable",
        "qualityFlag": quality_flag(video),
        "uploadedAt": video.date_added.date().isoformat(),
        "processCompletedAt": video.process_end.date().isoformat() if video.process_end else None,
        "durationMinutes": duration_minutes,
        "processingMinutes": processing_minutes,
        "downloads": 0,
        "views": 0,
        "qualityScore": 100 if quality_flag(video) == "Clean" else 75,
        "metadataPresence": [
            video.metadata_caption_present,
            video.metadata_hashtag_present,
            video.metadata_synopsis_present,
            video.metadata_subtitles_present,
            video.metadata_thumbnails_present,
            video.metadata_characters_present,
        ],
    }


def publish_status(video: FactVideo) -> str:
    if video.status_raw == 2:
        return "Failed"
    if video.published_raw == 1:
        return "Published"
    if video.status_raw in {0, 1}:
        return "Scheduled"
    return "Draft"


def quality_flag(video: FactVideo) -> str:
    if video.status_label.startswith("unknown("):
        return "Unknown mapping"
    if video.status_raw == 2:
        return "Failed job"
    if not video.source_url_present:
        return "Invalid URL"
    if not video.language or video.duration_seconds is None:
        return "Missing metadata"
    return "Clean"


def build_summary(records: list[dict[str, Any]]) -> dict[str, float]:
    originals = [record for record in records if record["outputType"].lower() == "original"]
    classified = [record for record in originals if record["processingStatus"] in {"done", "error"}]
    processed = sum(record["processingStatus"] == "done" for record in originals)
    published = sum(record["publishedStatus"] == "Published" for record in records)
    uploaded_duration = sum(record["durationMinutes"] for record in originals)
    processing_duration = sum(record["processingMinutes"] for record in originals if record["processingStatus"] == "done")
    generated_outputs = len(records) - len(originals)
    output_type_counts = {
        output_type: sum(record["outputType"].lower() == output_type for record in records)
        for output_type in ("chapters", "mykeymoments", "viral")
    }
    return {
        "uploaded": len(originals),
        "processed": processed,
        "published": published,
        "downloads": 0,
        "uploadedDuration": uploaded_duration,
        "processedDuration": processing_duration,
        "publishedDuration": sum(record["durationMinutes"] for record in records if record["publishedStatus"] == "Published"),
        "publishRate": round(published / max(1, len(originals)) * 100),
        "downloadRate": 0,
        "avgProcessing": round(processing_duration / max(1, processed), 2),
        "videosIngested": len(originals),
        "generatedOutputs": generated_outputs,
        "processingSuccessRate": round(processed / max(1, len(classified)) * 100, 2),
        "processingErrorRate": round(sum(record["processingStatus"] == "error" for record in originals) / max(1, len(classified)) * 100, 2),
        "processingBacklog": sum(record["processingStatus"] in {"not_started", "in_progress"} for record in originals),
        "processingTurnaround": round(processing_duration / max(1, processed), 2),
        "outputYield": round(generated_outputs / max(1, len(originals)), 2),
        "chapters": output_type_counts["chapters"],
        "mkmVideos": output_type_counts["mykeymoments"],
        "viralVideos": output_type_counts["viral"],
        "nonBillableVideos": sum(record.get("billableStatus") == "Non-billable" for record in records),
    }


def extend_operational_summary(
    summary: dict[str, float],
    services: list[FactServiceRequest],
    schedules: list[FactPublishSchedule],
    clipcuts: list[FactClipcutRequest],
    records: list[dict[str, Any]],
) -> dict[str, float]:
    classified_services = [service for service in services if service.status_label in {"done", "error"}]
    classified_schedules = [schedule for schedule in schedules if schedule.status_label in {"completed", "scheduled"}]
    classified_clipcuts = [clipcut for clipcut in clipcuts if clipcut.status_label in {"done", "error", "not_started", "in_progress"}]
    generated = [record for record in records if record["outputType"].lower() != "original"]
    present_metadata_fields = sum(sum(bool(value) for value in record["metadataPresence"]) for record in generated)
    completed_services = [service for service in services if service.status_label == "done"]
    completed_service_durations = [
        service.duration_seconds
        for service in completed_services
        if service.duration_seconds is not None
    ]
    errors = sum(service.status_label == "error" for service in classified_services)
    cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=24)

    return {
        **summary,
        "serviceCompletionRate": round(sum(service.status_label == "done" for service in classified_services) / max(1, len(classified_services)) * 100, 2),
        "serviceBacklog": sum(service.status_label in {"queued", "in_progress"} for service in services),
        "averageServiceLatency": round(sum(completed_service_durations) / max(1, len(completed_service_durations)) / 60, 2),
        "serviceErrorRate": round(errors / max(1, len(classified_services)) * 100, 2),
        "serviceErrorVolume": errors,
        "stuckServiceJobs24h": sum(
            service.status_label in {"queued", "in_progress"} and _service_timestamp(service) < cutoff
            for service in services
        ),
        "reels": len({
            service.video_source_id
            for service in services
            if service.video_source_id is not None
            and service.status_label == "done"
            and service.service_type == "reels"
        }),
        "shortsVideos": len({
            service.video_source_id
            for service in services
            if service.video_source_id is not None
            and service.status_label == "done"
            and service.service_type == "shorts"
        }),
        "replacedVideos": len({
            service.video_source_id
            for service in services
            if service.video_source_id is not None
            and service.video_replaced_count > 0
        }),
        "publishScheduleCompletionRate": round(sum(schedule.status_label == "completed" for schedule in classified_schedules) / max(1, len(classified_schedules)) * 100, 2),
        "publishThroughput": sum(schedule.status_label == "completed" for schedule in schedules),
        "metadataCompleteness": round(present_metadata_fields / max(1, len(generated) * 6) * 100, 2),
        "recordedQualityIssues": 0,
        "clipcutCompletionRate": round(sum(clipcut.status_label == "done" for clipcut in classified_clipcuts) / max(1, len(classified_clipcuts)) * 100, 2),
    }


def build_time_rows(records: list[dict[str, Any]], group: str) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for record in records:
        uploaded_key, uploaded_label = _group(record["uploadedAt"], group)
        row = grouped.setdefault(uploaded_key, _empty_time_row(uploaded_label, uploaded_key))
        if record["outputType"].lower() == "original":
            row["uploaded"] += 1
            row["uploadedDuration"] += record["durationMinutes"]
            if record["processingStatus"] == "done":
                completed_key, completed_label = _group(record["processCompletedAt"] or record["uploadedAt"], group)
                completed = grouped.setdefault(completed_key, _empty_time_row(completed_label, completed_key))
                completed["processed"] += 1
                completed["processedDuration"] += record["processingMinutes"]
        if record["publishedStatus"] == "Published":
            row["published"] += 1
            row["publishedDuration"] += record["durationMinutes"]
    return [{key: value for key, value in row.items() if key != "_sort"} for row in sorted(grouped.values(), key=lambda row: row["_sort"])]


def build_channel_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for record in records:
        row = grouped.setdefault(record["channel"], _empty_channel_row(record["channel"]))
        if record["outputType"].lower() == "original":
            row["uploaded"] += 1
            row["uploadedDuration"] += record["durationMinutes"]
            if record["processingStatus"] == "done":
                row["processed"] += 1
                row["processedDuration"] += record["processingMinutes"]
        if record["publishedStatus"] == "Published":
            row["published"] += 1
            row["publishedDuration"] += record["durationMinutes"]
    return sorted(grouped.values(), key=lambda row: row["published"], reverse=True)


def build_platform_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for record in records:
        row = grouped.setdefault(record["channel"], {"channel": record["channel"]})
        row[f'{record["platform"]}-count'] = row.get(f'{record["platform"]}-count', 0) + 1
        row[f'{record["platform"]}-duration'] = row.get(f'{record["platform"]}-duration', 0) + record["durationMinutes"]
    return list(grouped.values())


def build_quality_heatmap(issues: list[Any]) -> list[list[int]]:
    counts: dict[str, int] = {}
    for issue in issues:
        counts[issue.issue_code] = counts.get(issue.issue_code, 0) + 1
    values = list(counts.values())[:12]
    values += [0] * (12 - len(values))
    return [values[index : index + 4] for index in range(0, 12, 4)]


def _empty_time_row(label: str, sort_key: str) -> dict[str, Any]:
    return {"label": label, "_sort": sort_key, "uploaded": 0, "processed": 0, "published": 0, "uploadedDuration": 0, "processedDuration": 0, "publishedDuration": 0}


def _empty_channel_row(channel: str) -> dict[str, Any]:
    return {"channel": channel, "uploaded": 0, "processed": 0, "published": 0, "uploadedDuration": 0, "processedDuration": 0, "publishedDuration": 0}


def _group(value: str, group: str) -> tuple[str, str]:
    parsed = datetime.fromisoformat(value)
    if group == "month":
        return parsed.strftime("%Y-%m"), parsed.strftime("%B %Y")
    if group == "year":
        return str(parsed.year), str(parsed.year)
    return parsed.date().isoformat(), f"{parsed.strftime('%b')} {parsed.day}"


def _date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _matches(filter_value: str | None, record_value: str) -> bool:
    return not filter_value or filter_value == "all" or filter_value == record_value


def _service_timestamp(service: FactServiceRequest) -> datetime:
    return service.date_updated or service.start_time or service.date_added


def _has_active_filters(context: dict[str, Any] | None) -> bool:
    if not context:
        return False
    date_range = context.get("dateRange", {})
    if date_range.get("start") or date_range.get("end"):
        return True
    filters = context.get("filters", {})
    return any(
        value not in {None, "", "all", "none", "previous-period"}
        for key, value in filters.items()
        if key not in {"comparison", "dimension", "dimensionFilter", "includeDeleted"}
    ) or filters.get("includeDeleted") is False


def _requires_service_rows(context: dict[str, Any] | None) -> bool:
    return _matches_required(context, "serviceType")


def _requires_schedule_rows(context: dict[str, Any] | None) -> bool:
    return _matches_required(context, "publishPlatform")


def _matches_required(context: dict[str, Any] | None, key: str) -> bool:
    value = (context or {}).get("filters", {}).get(key)
    return value not in {None, "", "all"}


def _matches_related_service(
    service: FactServiceRequest,
    context: dict[str, Any] | None,
    selected_video_ids: set[int],
    has_filters: bool,
) -> bool:
    filters = (context or {}).get("filters", {})
    return (
        (not has_filters or service.video_source_id in selected_video_ids)
        and _matches(filters.get("serviceType"), service.service_type)
        and _matches(filters.get("status"), service.status_label)
    )


def _matches_related_schedule(
    schedule: FactPublishSchedule,
    context: dict[str, Any] | None,
    selected_video_md5s: set[str],
    has_filters: bool,
) -> bool:
    filters = (context or {}).get("filters", {})
    return (
        (not has_filters or schedule.video_md5 in selected_video_md5s)
        and _matches(filters.get("publishPlatform"), schedule.publish_platform)
        and _matches(filters.get("status"), schedule.status_label)
        and (filters.get("includeDeleted") is not False or not schedule.is_deleted)
    )


def _matches_related_clipcut(
    clipcut: FactClipcutRequest,
    context: dict[str, Any] | None,
    selected_video_md5s: set[str],
    has_filters: bool,
) -> bool:
    filters = (context or {}).get("filters", {})
    return (
        (not has_filters or clipcut.video_md5 in selected_video_md5s)
        and _matches(filters.get("status"), clipcut.status_label)
    )


def _canonical_query(dataset: str, dimensions: list[str], config: dict[str, Any], context: dict[str, Any] | None) -> dict[str, Any]:
    return {
        "metric": config.get("metricId") or config.get("metric") or "recordCount",
        "dimensions": dimensions,
        "filters": (context or {}).get("filters", {}),
        "grain": config.get("timeGroup"),
        "comparison": (context or {}).get("comparison"),
        "sort": config.get("sortBy"),
        "limit": config.get("limit") or config.get("rowsLimit"),
        "dataset": dataset,
    }
