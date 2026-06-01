from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from statistics import mean
from typing import Any, Iterable

from apps.api.app.models.analytics import FactVideo
from apps.api.app.repositories.analytics import AnalyticsRepository
from apps.api.app.schemas.analytics import AnalyticsFilterState, WarehouseMetricRequest, WarehouseQueryRequest


DATASET_CATALOG = {
    "videos": {
        "label": "Videos",
        "dimensions": ["date", "company", "channel", "user", "language", "videoType", "sourcePlatform", "status"],
        "metrics": ["recordCount", "publishedCount", "durationSeconds", "processingSeconds", "metadataCompleteness", "completionRate", "errorRate"],
    },
    "serviceRequests": {
        "label": "Service requests",
        "dimensions": ["date", "company", "channel", "user", "language", "videoType", "serviceType", "sourcePlatform", "status"],
        "metrics": ["recordCount", "durationSeconds", "completionRate", "errorRate"],
    },
    "publishSchedules": {
        "label": "Publish schedules",
        "dimensions": ["date", "company", "channel", "user", "publishPlatform", "status"],
        "metrics": ["recordCount", "completionRate"],
    },
    "clipcutRequests": {
        "label": "Clip-cut requests",
        "dimensions": ["date", "company", "channel", "user", "language", "videoType", "sourcePlatform", "status"],
        "metrics": ["recordCount", "completionRate", "errorRate"],
    },
    "trendingSnapshots": {
        "label": "Trending snapshots",
        "dimensions": ["date", "trendType", "country"],
        "metrics": ["recordCount", "rankOrder"],
    },
    "lineage": {
        "label": "Video lineage",
        "dimensions": ["videoType"],
        "metrics": ["recordCount"],
    },
    "qualityIssues": {
        "label": "Data-quality issues",
        "dimensions": ["date", "sourceTable", "issueCode", "severity"],
        "metrics": ["recordCount"],
    },
}


@dataclass
class WarehouseQueryResult:
    rows: list[dict[str, Any]]
    groups: list[dict[str, Any]]
    meta: dict[str, Any]


class WarehouseQueryService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self.repository = repository

    async def query(self, request: WarehouseQueryRequest) -> WarehouseQueryResult:
        rows = await self._dataset_rows(request.dataset)
        invalid_filters = set(request.dimensionFilters) - set(DATASET_CATALOG[request.dataset]["dimensions"])
        if invalid_filters:
            raise ValueError(f"Unsupported dimension filters for {request.dataset}: {sorted(invalid_filters)}")
        filtered = filter_rows(rows, request.filters, request.search, request.dimensionFilters)
        groups = aggregate_rows(filtered, request.groupBy, request.metrics, request.dataset)
        groups = sort_rows(groups, request.sortBy or _default_sort(request.metrics), request.sortDirection)
        latest = await self.repository.latest_load_run()
        return WarehouseQueryResult(
            rows=sort_rows(filtered, request.sortBy or "date", request.sortDirection)[: request.limit],
            groups=groups[: request.limit],
            meta={
                "source": "sql",
                "availability": "available",
                "dataset": request.dataset,
                "totalRows": len(rows),
                "filteredRows": len(filtered),
                "asOf": latest.finished_at.isoformat() if latest and latest.finished_at else None,
            },
        )

    async def catalog(self) -> dict[str, Any]:
        filters = await self.repository.filter_options()
        return {
            "datasets": [
                {"id": dataset_id, **definition}
                for dataset_id, definition in DATASET_CATALOG.items()
            ],
            "dimensions": [
                "date",
                "company",
                "channel",
                "user",
                "language",
                "videoType",
                "serviceType",
                "sourcePlatform",
                "publishPlatform",
                "status",
                "trendType",
                "country",
                "sourceTable",
                "issueCode",
                "severity",
            ],
            "metricAggregations": ["count", "sum", "avg", "min", "max", "rate"],
            "filters": filters,
        }

    async def _dataset_rows(self, dataset: str) -> list[dict[str, Any]]:
        videos = await self.repository.list_videos()
        video_rows = [_video_row(row) for row in videos]
        video_by_id = {row["id"]: row for row in video_rows}
        video_by_md5 = {row["videoMd5"]: row for row in video_rows}

        if dataset == "videos":
            return video_rows
        if dataset == "serviceRequests":
            return [_service_row(row, video_by_id.get(row.video_source_id)) for row in await self.repository.list_services()]
        if dataset == "publishSchedules":
            return [_schedule_row(row, video_by_md5.get(row.video_md5)) for row in await self.repository.list_publish_schedules()]
        if dataset == "clipcutRequests":
            user_names = await self.repository.user_names_by_id()
            return [
                _clipcut_row(row, video_by_md5.get(row.video_md5 or ""), user_names.get(row.user_source_id))
                for row in await self.repository.list_clipcut_requests()
            ]
        if dataset == "trendingSnapshots":
            return [
                {
                    "id": row.source_id,
                    "date": _iso(row.trending_at),
                    "name": row.name,
                    "trendType": row.trend_type,
                    "country": row.country or "Unknown",
                    "rankOrder": row.rank_order,
                    "status": "snapshot",
                    "searchText": _search_text(row.source_id, row.name, row.trend_type, row.country),
                }
                for row in await self.repository.list_trending_snapshots()
            ]
        if dataset == "lineage":
            return [
                {
                    "id": row.child_video_source_id,
                    "childVideoId": row.child_video_source_id,
                    "parentVideoId": row.parent_video_source_id,
                    "videoType": row.child_video_type,
                    "status": "linked",
                    "searchText": _search_text(row.child_video_source_id, row.parent_video_source_id, row.child_video_type),
                }
                for row in await self.repository.list_lineage()
            ]
        return [
            {
                "id": row.id,
                "date": _iso(row.created_at),
                "sourceTable": row.source_table,
                "sourceKey": row.source_key,
                "issueCode": row.issue_code,
                "severity": row.severity,
                "status": row.issue_code,
                "details": row.details,
                "searchText": _search_text(row.source_table, row.source_key, row.issue_code, row.severity, row.details),
            }
            for row in await self.repository.list_quality_issues(limit=10000)
        ]


def filter_rows(
    rows: list[dict[str, Any]],
    filters: AnalyticsFilterState,
    search: str | None,
    dimension_filters: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    start = _date(filters.dateStart)
    end = _date(filters.dateEnd)
    terms = [term for term in (search or "").lower().split() if term]

    def matches(row: dict[str, Any]) -> bool:
        row_date = _date(row.get("date"))
        if start and row_date and row_date < start:
            return False
        if end and row_date and row_date > end:
            return False
        if not filters.includeDeleted and row.get("deleted"):
            return False
        for key, value in (
            ("company", filters.company),
            ("channel", filters.channel),
            ("user", filters.user),
            ("language", filters.language),
            ("videoType", filters.videoType),
            ("serviceType", filters.serviceType),
            ("sourcePlatform", filters.sourcePlatform),
            ("publishPlatform", filters.publishPlatform),
            ("status", filters.status),
        ):
            if value and value != "all" and str(row.get(key, "")).lower() != value.lower():
                return False
        for key, value in (dimension_filters or {}).items():
            if value and value != "all" and str(row.get(key, "")).lower() != value.lower():
                return False
        return not terms or all(term in str(row.get("searchText", "")).lower() for term in terms)

    return [row for row in rows if matches(row)]


def aggregate_rows(
    rows: list[dict[str, Any]],
    group_by: list[str],
    metrics: list[WarehouseMetricRequest],
    dataset: str,
) -> list[dict[str, Any]]:
    definition = DATASET_CATALOG[dataset]
    invalid_dimensions = set(group_by) - set(definition["dimensions"])
    if invalid_dimensions:
        raise ValueError(f"Unsupported dimensions for {dataset}: {sorted(invalid_dimensions)}")
    invalid_metrics = {metric.id for metric in metrics} - set(definition["metrics"])
    if invalid_metrics:
        raise ValueError(f"Unsupported metrics for {dataset}: {sorted(invalid_metrics)}")

    grouped: dict[tuple[Any, ...], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[tuple(row.get(dimension, "Unknown") for dimension in group_by)].append(row)
    if not grouped and not group_by:
        grouped[()] = []

    result = []
    for values, matching_rows in grouped.items():
        item = {dimension: value for dimension, value in zip(group_by, values)}
        for metric in metrics:
            item[metric.id] = calculate_metric(matching_rows, metric)
        result.append(item)
    return result


def calculate_metric(rows: list[dict[str, Any]], metric: WarehouseMetricRequest) -> float | int:
    if metric.id == "recordCount":
        return len(rows)
    if metric.id == "publishedCount":
        return sum(bool(row.get("published")) for row in rows)
    if metric.id == "completionRate":
        return _rate(rows, {"done", "completed"}, {"done", "completed", "error", "scheduled", "not_started", "in_progress", "queued"})
    if metric.id == "errorRate":
        return _rate(rows, {"error"}, {"done", "completed", "error", "not_started", "in_progress", "queued"})

    field = metric.id
    values = [float(row[field]) for row in rows if isinstance(row.get(field), (int, float))]
    if not values:
        return 0
    if metric.aggregation == "sum":
        return round(sum(values), 2)
    if metric.aggregation == "min":
        return round(min(values), 2)
    if metric.aggregation == "max":
        return round(max(values), 2)
    if metric.aggregation == "count":
        return len(values)
    return round(mean(values), 2)


def sort_rows(rows: list[dict[str, Any]], sort_by: str, direction: str) -> list[dict[str, Any]]:
    return sorted(
        rows,
        key=lambda row: (row.get(sort_by) is not None, row.get(sort_by)),
        reverse=direction == "desc",
    )


def _video_row(row: dict[str, Any]) -> dict[str, Any]:
    video: FactVideo = row["video"]
    metadata = [
        video.metadata_caption_present,
        video.metadata_hashtag_present,
        video.metadata_synopsis_present,
        video.metadata_subtitles_present,
        video.metadata_thumbnails_present,
        video.metadata_characters_present,
    ]
    return {
        "id": video.source_id,
        "date": _iso(video.date_added),
        "company": row["company_name"],
        "channel": row["channel_name"],
        "user": row["user_name"],
        "language": video.language or "Unknown",
        "videoType": video.video_type,
        "sourcePlatform": video.source_url_type or "Unknown",
        "status": video.status_label,
        "published": video.published_raw == 1,
        "deleted": video.is_deleted,
        "headline": video.headline or video.filename or f"Video {video.source_id}",
        "videoMd5": video.video_md5,
        "durationSeconds": video.duration_seconds,
        "processingSeconds": video.total_time_taken_seconds,
        "metadataCompleteness": round(sum(bool(value) for value in metadata) / 6 * 100, 2),
        "parentVideoId": video.parent_source_video_id,
        "searchText": _search_text(video.source_id, video.video_md5, video.headline, video.filename, row["company_name"], row["channel_name"], row["user_name"], video.language, video.video_type, video.source_url_type, video.status_label),
    }


def _service_row(row: Any, video_row: dict[str, Any] | None) -> dict[str, Any]:
    dimensions = _joined_video_dimensions(video_row)
    return {
        **dimensions,
        "id": row.source_id,
        "date": _iso(row.date_added),
        "videoId": row.video_source_id,
        "serviceType": row.service_type,
        "initiatedBy": row.initiated_by,
        "status": row.status_label,
        "durationSeconds": row.duration_seconds,
        "published": row.published_raw == 1,
        "searchText": _search_text(row.source_id, row.video_source_id, row.service_type, row.initiated_by, row.status_label, *dimensions.values()),
    }


def _schedule_row(row: Any, video_row: dict[str, Any] | None) -> dict[str, Any]:
    dimensions = _joined_video_dimensions(video_row)
    return {
        **dimensions,
        "id": row.source_id,
        "date": _iso(row.scheduled_time),
        "videoMd5": row.video_md5,
        "publishPlatform": row.publish_platform,
        "status": row.status_label,
        "deleted": row.is_deleted,
        "searchText": _search_text(row.source_id, row.video_md5, row.publish_platform, row.status_label, *dimensions.values()),
    }


def _clipcut_row(row: Any, video_row: dict[str, Any] | None, user_name: str | None = None) -> dict[str, Any]:
    dimensions = _joined_video_dimensions(video_row)
    dimensions["user"] = user_name or dimensions["user"]
    return {
        **dimensions,
        "id": row.source_id,
        "date": _iso(row.created_at),
        "videoMd5": row.video_md5,
        "aspectRatio": row.aspect_ratio_type,
        "seriesName": row.series_name,
        "status": row.status_label,
        "searchText": _search_text(row.source_id, row.video_md5, row.aspect_ratio_type, row.series_name, row.status_label, *dimensions.values()),
    }


def _joined_video_dimensions(row: dict[str, Any] | None) -> dict[str, Any]:
    return {
        key: row.get(key, "Unknown") if row else "Unknown"
        for key in ("company", "channel", "user", "language", "videoType", "sourcePlatform")
    }


def _rate(rows: list[dict[str, Any]], numerators: set[str], denominators: set[str]) -> float:
    classified = [row for row in rows if row.get("status") in denominators]
    return round(sum(row.get("status") in numerators for row in classified) / max(1, len(classified)) * 100, 2)


def _date(value: str | None) -> date | None:
    return date.fromisoformat(value[:10]) if value else None


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _search_text(*values: Any) -> str:
    return " ".join(str(value) for value in values if value is not None)


def _default_sort(metrics: Iterable[WarehouseMetricRequest]) -> str:
    return next(iter(metrics), WarehouseMetricRequest(id="recordCount")).id
