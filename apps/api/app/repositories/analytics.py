from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Integer, Numeric, Select, String, and_, case, cast, desc, exists, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.models.analytics import (
    AnalyticsDataQualityIssue,
    AnalyticsLoadRun,
    DimChannel,
    DimCompany,
    DimUser,
    FactPublishSchedule,
    FactClipcutRequest,
    FactServiceRequest,
    FactTrendingSnapshot,
    FactVideo,
    BridgeVideoLineage,
)
from apps.api.app.schemas.analytics import WarehouseMetricRequest, WarehouseQueryRequest


class AnalyticsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_videos(self, include_deleted: bool = True) -> list[dict]:
        statement = (
            select(FactVideo, DimCompany.name, DimChannel.name, DimUser.name)
            .outerjoin(DimCompany, DimCompany.source_id == FactVideo.company_source_id)
            .outerjoin(DimChannel, DimChannel.source_id == FactVideo.channel_source_id)
            .outerjoin(DimUser, DimUser.source_id == FactVideo.user_source_id)
        )
        if not include_deleted:
            statement = statement.where(FactVideo.is_deleted.is_(False))
        rows = (await self.session.execute(statement)).all()
        return [
            {
                "video": video,
                "company_name": company_name or f"Unknown company ({video.company_source_id})",
                "channel_name": channel_name or f"Unknown channel ({video.channel_source_id})",
                "user_name": user_name or f"Unknown user ({video.user_source_id})",
            }
            for video, company_name, channel_name, user_name in rows
        ]

    async def list_services(self) -> list[FactServiceRequest]:
        return list((await self.session.scalars(select(FactServiceRequest))).all())

    async def list_publish_schedules(self, include_deleted: bool = True) -> list[FactPublishSchedule]:
        statement = select(FactPublishSchedule)
        if not include_deleted:
            statement = statement.where(FactPublishSchedule.is_deleted.is_(False))
        return list((await self.session.scalars(statement)).all())

    async def list_clipcut_requests(self) -> list[FactClipcutRequest]:
        return list((await self.session.scalars(select(FactClipcutRequest))).all())

    async def user_names_by_id(self) -> dict[int, str]:
        return dict((await self.session.execute(select(DimUser.source_id, DimUser.name))).all())

    async def list_trending_snapshots(self) -> list[FactTrendingSnapshot]:
        return list((await self.session.scalars(select(FactTrendingSnapshot))).all())

    async def list_lineage(self) -> list[BridgeVideoLineage]:
        return list((await self.session.scalars(select(BridgeVideoLineage))).all())

    async def list_quality_issues(self, limit: int = 500) -> list[AnalyticsDataQualityIssue]:
        statement: Select = (
            select(AnalyticsDataQualityIssue)
            .order_by(desc(AnalyticsDataQualityIssue.id))
            .limit(limit)
        )
        return list((await self.session.scalars(statement)).all())

    async def latest_load_run(self) -> AnalyticsLoadRun | None:
        return await self.session.scalar(select(AnalyticsLoadRun).order_by(desc(AnalyticsLoadRun.id)).limit(1))

    async def get_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        return {
            **await self.get_video_summary_metrics(context),
            **await self.get_service_summary_metrics(context),
            **await self.get_publish_summary_metrics(context),
            **await self.get_clipcut_summary_metrics(context),
        }

    async def get_video_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        is_original = func.lower(FactVideo.video_type) == "original"
        is_generated = func.lower(FactVideo.video_type) != "original"
        is_published = and_(FactVideo.status_raw != 2, FactVideo.published_raw == 1)
        classified = and_(is_original, FactVideo.status_label.in_(["done", "error"]))
        duration_minutes = func.round(cast(func.coalesce(FactVideo.duration_seconds, 0), Numeric) / 60, 2)
        processing_minutes = func.round(cast(func.coalesce(FactVideo.total_time_taken_seconds, 0), Numeric) / 60, 2)
        metadata_fields = sum(
            (
                case((column.is_(True), 1), else_=0)
                for column in (
                    FactVideo.metadata_caption_present,
                    FactVideo.metadata_hashtag_present,
                    FactVideo.metadata_synopsis_present,
                    FactVideo.metadata_subtitles_present,
                    FactVideo.metadata_thumbnails_present,
                    FactVideo.metadata_characters_present,
                )
            ),
            literal(0),
        )
        statement = select(
            func.count().filter(is_original).label("videos_ingested"),
            func.count().filter(is_generated).label("generated_outputs"),
            func.count().filter(and_(is_original, FactVideo.status_label == "done")).label("processed"),
            func.count().filter(and_(is_original, FactVideo.status_label == "error")).label("processing_errors"),
            func.count().filter(classified).label("classified_originals"),
            func.count().filter(and_(is_original, FactVideo.status_label.in_(["not_started", "in_progress"]))).label("processing_backlog"),
            func.count().filter(is_published).label("published"),
            func.coalesce(func.sum(case((is_original, duration_minutes), else_=literal(0, type_=Numeric))), 0).label("uploaded_duration"),
            func.coalesce(func.sum(case((is_original, processing_minutes), else_=literal(0, type_=Numeric))), 0).label("processing_duration"),
            func.coalesce(func.sum(case((is_published, duration_minutes), else_=literal(0, type_=Numeric))), 0).label("published_duration"),
            func.coalesce(func.sum(case((is_generated, metadata_fields), else_=0)), 0).label("present_metadata_fields"),
        )
        row = (await self.session.execute(self._with_video_filters(statement, context))).one()._mapping
        videos_ingested = _int(row["videos_ingested"])
        generated_outputs = _int(row["generated_outputs"])
        processed = _int(row["processed"])
        processing_errors = _int(row["processing_errors"])
        classified_originals = _int(row["classified_originals"])
        published = _int(row["published"])
        uploaded_duration = _float(row["uploaded_duration"])
        processing_duration = _float(row["processing_duration"])

        return {
            "uploaded": videos_ingested,
            "processed": processed,
            "published": published,
            "downloads": 0,
            "uploadedDuration": uploaded_duration,
            "processedDuration": processing_duration,
            "publishedDuration": _float(row["published_duration"]),
            "publishRate": round(published / max(1, videos_ingested) * 100),
            "downloadRate": 0,
            "avgProcessing": round(processing_duration / max(1, videos_ingested), 2),
            "videosIngested": videos_ingested,
            "generatedOutputs": generated_outputs,
            "processingSuccessRate": _rate(processed, classified_originals),
            "processingErrorRate": _rate(processing_errors, classified_originals),
            "processingBacklog": _int(row["processing_backlog"]),
            "processingTurnaround": round(processing_duration / max(1, videos_ingested), 2),
            "outputYield": round(generated_outputs / max(1, videos_ingested), 2),
            "metadataCompleteness": _rate(_int(row["present_metadata_fields"]), generated_outputs * 6),
        }

    async def get_service_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        conditions = self._related_service_filters(context)
        classified = FactServiceRequest.status_label.in_(["done", "error"])
        statement = select(
            func.count().filter(and_(classified, FactServiceRequest.status_label == "done")).label("completed"),
            func.count().filter(classified).label("classified"),
            func.count().filter(FactServiceRequest.status_label.in_(["queued", "in_progress"])).label("backlog"),
        ).where(*conditions)
        row = (await self.session.execute(statement)).one()._mapping
        return {
            "serviceCompletionRate": _rate(_int(row["completed"]), _int(row["classified"])),
            "serviceBacklog": _int(row["backlog"]),
        }

    async def get_publish_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        conditions = self._related_schedule_filters(context)
        classified = FactPublishSchedule.status_label.in_(["completed", "scheduled"])
        statement = select(
            func.count().filter(and_(classified, FactPublishSchedule.status_label == "completed")).label("completed"),
            func.count().filter(classified).label("classified"),
        ).where(*conditions)
        row = (await self.session.execute(statement)).one()._mapping
        return {"publishScheduleCompletionRate": _rate(_int(row["completed"]), _int(row["classified"]))}

    async def get_clipcut_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        conditions = self._related_clipcut_filters(context)
        classified = FactClipcutRequest.status_label.in_(["done", "error", "not_started", "in_progress"])
        statement = select(
            func.count().filter(and_(classified, FactClipcutRequest.status_label == "done")).label("completed"),
            func.count().filter(classified).label("classified"),
        ).where(*conditions)
        row = (await self.session.execute(statement)).one()._mapping
        return {"clipcutCompletionRate": _rate(_int(row["completed"]), _int(row["classified"]))}

    async def aggregate_warehouse_query(self, request: WarehouseQueryRequest) -> list[dict[str, Any]]:
        spec = _warehouse_spec(request.dataset)
        dimensions = spec["dimensions"]
        invalid_dimensions = set(request.groupBy) - set(dimensions)
        if invalid_dimensions:
            raise ValueError(f"Unsupported dimensions for {request.dataset}: {sorted(invalid_dimensions)}")
        invalid_metrics = {metric.id for metric in request.metrics} - set(spec["metrics"])
        if invalid_metrics:
            raise ValueError(f"Unsupported metrics for {request.dataset}: {sorted(invalid_metrics)}")

        grouped = [dimensions[name].label(name) for name in request.groupBy]
        metrics = [_warehouse_metric_expression(spec, metric).label(metric.id) for metric in request.metrics]
        statement = (
            select(*grouped, *metrics)
            .select_from(spec["from"])
            .where(*_warehouse_conditions(spec, request))
            .group_by(*[dimensions[name] for name in request.groupBy])
        )
        return [_serialize_mapping(row._mapping) for row in (await self.session.execute(statement)).all()]

    async def filter_options(self) -> dict[str, list[str]]:
        videos = await self.list_videos()
        schedules = await self.list_publish_schedules()
        services = await self.list_services()

        def values(key: str) -> list[str]:
            return sorted({str(row[key]) for row in videos if row.get(key)})

        return {
            "companies": values("company_name"),
            "channels": values("channel_name"),
            "users": values("user_name"),
            "languages": sorted({row["video"].language for row in videos if row["video"].language}),
            "videoTypes": sorted({row["video"].video_type for row in videos if row["video"].video_type}),
            "sourcePlatforms": sorted({row["video"].source_url_type for row in videos if row["video"].source_url_type}),
            "publishPlatforms": sorted({row.publish_platform for row in schedules if row.publish_platform}),
            "serviceTypes": sorted({row.service_type for row in services if row.service_type}),
            "videoStatuses": sorted({row["video"].status_label for row in videos}),
            "serviceStatuses": sorted({row.status_label for row in services}),
        }

    def _with_video_filters(self, statement: Select, context: dict[str, Any] | None) -> Select:
        return (
            statement.outerjoin(DimCompany, DimCompany.source_id == FactVideo.company_source_id)
            .outerjoin(DimChannel, DimChannel.source_id == FactVideo.channel_source_id)
            .outerjoin(DimUser, DimUser.source_id == FactVideo.user_source_id)
            .where(*self._video_filter_conditions(context))
        )

    def _video_filter_conditions(self, context: dict[str, Any] | None) -> list[Any]:
        if not context:
            return []
        filters = context.get("filters", {})
        date_range = context.get("dateRange", {})
        conditions: list[Any] = []
        start = _date(date_range.get("start"))
        end = _date(date_range.get("end"))
        if start:
            conditions.append(func.date(FactVideo.date_added) >= start)
        if end:
            conditions.append(func.date(FactVideo.date_added) <= end)
        for value, column in (
            (filters.get("company"), _dimension_name(DimCompany.name, "Unknown company", FactVideo.company_source_id)),
            (filters.get("channel"), _dimension_name(DimChannel.name, "Unknown channel", FactVideo.channel_source_id)),
            (filters.get("user"), _dimension_name(DimUser.name, "Unknown user", FactVideo.user_source_id)),
            (filters.get("language"), func.coalesce(FactVideo.language, "unknown")),
            (filters.get("videoType"), FactVideo.video_type),
            (filters.get("sourcePlatform"), func.coalesce(FactVideo.source_url_type, "unknown")),
            (filters.get("status"), FactVideo.status_label),
            (filters.get("published"), _publish_status_expression()),
        ):
            if _active(value):
                conditions.append(column == value)
        if filters.get("includeDeleted") is False:
            conditions.append(FactVideo.is_deleted.is_(False))
        if _active(filters.get("serviceType")):
            conditions.append(
                exists(
                    select(FactServiceRequest.source_id).where(
                        FactServiceRequest.video_source_id == FactVideo.source_id,
                        FactServiceRequest.service_type == filters["serviceType"],
                    )
                )
            )
        if _active(filters.get("publishPlatform")):
            conditions.append(
                exists(
                    select(FactPublishSchedule.source_id).where(
                        FactPublishSchedule.video_md5 == FactVideo.video_md5,
                        FactPublishSchedule.publish_platform == filters["publishPlatform"],
                    )
                )
            )
        return conditions

    def _related_service_filters(self, context: dict[str, Any] | None) -> list[Any]:
        filters = (context or {}).get("filters", {})
        conditions: list[Any] = []
        if _has_active_filters(context):
            conditions.append(
                exists(
                    self._with_video_filters(
                        select(FactVideo.source_id).where(FactVideo.source_id == FactServiceRequest.video_source_id),
                        context,
                    )
                )
            )
        if _active(filters.get("serviceType")):
            conditions.append(FactServiceRequest.service_type == filters["serviceType"])
        if _active(filters.get("status")):
            conditions.append(FactServiceRequest.status_label == filters["status"])
        return conditions

    def _related_schedule_filters(self, context: dict[str, Any] | None) -> list[Any]:
        filters = (context or {}).get("filters", {})
        conditions: list[Any] = []
        if _has_active_filters(context):
            conditions.append(
                exists(
                    self._with_video_filters(
                        select(FactVideo.source_id).where(FactVideo.video_md5 == FactPublishSchedule.video_md5),
                        context,
                    )
                )
            )
        if _active(filters.get("publishPlatform")):
            conditions.append(FactPublishSchedule.publish_platform == filters["publishPlatform"])
        if _active(filters.get("status")):
            conditions.append(FactPublishSchedule.status_label == filters["status"])
        if filters.get("includeDeleted") is False:
            conditions.append(FactPublishSchedule.is_deleted.is_(False))
        return conditions

    def _related_clipcut_filters(self, context: dict[str, Any] | None) -> list[Any]:
        filters = (context or {}).get("filters", {})
        conditions: list[Any] = []
        if _has_active_filters(context):
            conditions.append(
                exists(
                    self._with_video_filters(
                        select(FactVideo.source_id).where(FactVideo.video_md5 == FactClipcutRequest.video_md5),
                        context,
                    )
                )
            )
        if _active(filters.get("status")):
            conditions.append(FactClipcutRequest.status_label == filters["status"])
        return conditions


def _dimension_name(column: Any, label: str, source_id: Any) -> Any:
    return func.coalesce(
        column,
        func.concat(label, " (", func.coalesce(cast(source_id, String), literal("None")), ")"),
    )


def _publish_status_expression() -> Any:
    return case(
        (FactVideo.status_raw == 2, "Failed"),
        (FactVideo.published_raw == 1, "Published"),
        (FactVideo.status_raw.in_([0, 1]), "Scheduled"),
        else_="Draft",
    )


def _date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _active(value: Any) -> bool:
    return value not in {None, "", "all"}


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


def _int(value: Any) -> int:
    return int(value or 0)


def _float(value: Any) -> float:
    return float(value or 0)


def _rate(numerator: int, denominator: int) -> float:
    return round(numerator / max(1, denominator) * 100, 2)


def _warehouse_spec(dataset: str) -> dict[str, Any]:
    company = _dimension_name(DimCompany.name, "Unknown company", FactVideo.company_source_id)
    channel = _dimension_name(DimChannel.name, "Unknown channel", FactVideo.channel_source_id)
    user = _dimension_name(DimUser.name, "Unknown user", FactVideo.user_source_id)
    video_from = (
        FactVideo.__table__.outerjoin(DimCompany, DimCompany.source_id == FactVideo.company_source_id)
        .outerjoin(DimChannel, DimChannel.source_id == FactVideo.channel_source_id)
        .outerjoin(DimUser, DimUser.source_id == FactVideo.user_source_id)
    )
    video_dimensions = {
        "date": FactVideo.date_added,
        "company": company,
        "channel": channel,
        "user": user,
        "language": func.coalesce(FactVideo.language, "Unknown"),
        "videoType": FactVideo.video_type,
        "sourcePlatform": func.coalesce(FactVideo.source_url_type, "Unknown"),
        "status": FactVideo.status_label,
    }
    metadata_completeness = (
        sum(
            (
                case((column.is_(True), 1), else_=0)
                for column in (
                    FactVideo.metadata_caption_present,
                    FactVideo.metadata_hashtag_present,
                    FactVideo.metadata_synopsis_present,
                    FactVideo.metadata_subtitles_present,
                    FactVideo.metadata_thumbnails_present,
                    FactVideo.metadata_characters_present,
                )
            ),
            literal(0),
        )
        / 6.0
        * 100
    )
    if dataset == "videos":
        return _spec(
            video_from,
            video_dimensions,
            {
                "recordCount": None,
                "publishedCount": FactVideo.published_raw == 1,
                "durationSeconds": FactVideo.duration_seconds,
                "processingSeconds": FactVideo.total_time_taken_seconds,
                "metadataCompleteness": metadata_completeness,
                "completionRate": FactVideo.status_label,
                "errorRate": FactVideo.status_label,
            },
            FactVideo.date_added,
            FactVideo.is_deleted,
            [
                FactVideo.source_id,
                FactVideo.video_md5,
                FactVideo.headline,
                FactVideo.filename,
                *video_dimensions.values(),
            ],
        )

    joined_video = FactVideo.__table__.outerjoin(DimCompany, DimCompany.source_id == FactVideo.company_source_id).outerjoin(
        DimChannel, DimChannel.source_id == FactVideo.channel_source_id
    ).outerjoin(DimUser, DimUser.source_id == FactVideo.user_source_id)
    if dataset == "serviceRequests":
        dimensions = {**video_dimensions, "date": FactServiceRequest.date_added, "serviceType": FactServiceRequest.service_type, "status": FactServiceRequest.status_label}
        return _spec(
            FactServiceRequest.__table__.outerjoin(joined_video, FactVideo.source_id == FactServiceRequest.video_source_id),
            dimensions,
            {"recordCount": None, "durationSeconds": FactServiceRequest.duration_seconds, "completionRate": FactServiceRequest.status_label, "errorRate": FactServiceRequest.status_label},
            FactServiceRequest.date_added,
            None,
            [FactServiceRequest.source_id, FactServiceRequest.video_source_id, FactServiceRequest.initiated_by, *dimensions.values()],
        )
    if dataset == "publishSchedules":
        dimensions = {**{key: value for key, value in video_dimensions.items() if key not in {"date", "status"}}, "date": FactPublishSchedule.scheduled_time, "publishPlatform": FactPublishSchedule.publish_platform, "status": FactPublishSchedule.status_label}
        return _spec(
            FactPublishSchedule.__table__.outerjoin(joined_video, FactVideo.video_md5 == FactPublishSchedule.video_md5),
            dimensions,
            {"recordCount": None, "completionRate": FactPublishSchedule.status_label},
            FactPublishSchedule.scheduled_time,
            FactPublishSchedule.is_deleted,
            [FactPublishSchedule.source_id, FactPublishSchedule.video_md5, *dimensions.values()],
        )
    if dataset == "clipcutRequests":
        clipcut_user = DimUser.__table__.alias("clipcut_user")
        dimensions = {
            **video_dimensions,
            "date": FactClipcutRequest.created_at,
            "user": _dimension_name(clipcut_user.c.name, "Unknown user", FactClipcutRequest.user_source_id),
            "status": FactClipcutRequest.status_label,
        }
        return _spec(
            FactClipcutRequest.__table__.outerjoin(joined_video, FactVideo.video_md5 == FactClipcutRequest.video_md5).outerjoin(
                clipcut_user, clipcut_user.c.source_id == FactClipcutRequest.user_source_id
            ),
            dimensions,
            {"recordCount": None, "completionRate": FactClipcutRequest.status_label, "errorRate": FactClipcutRequest.status_label},
            FactClipcutRequest.created_at,
            None,
            [FactClipcutRequest.source_id, FactClipcutRequest.video_md5, FactClipcutRequest.aspect_ratio_type, FactClipcutRequest.series_name, *dimensions.values()],
        )
    if dataset == "trendingSnapshots":
        dimensions = {"date": FactTrendingSnapshot.trending_at, "trendType": FactTrendingSnapshot.trend_type, "country": func.coalesce(FactTrendingSnapshot.country, "Unknown")}
        return _spec(
            FactTrendingSnapshot.__table__,
            dimensions,
            {"recordCount": None, "rankOrder": FactTrendingSnapshot.rank_order},
            FactTrendingSnapshot.trending_at,
            None,
            [FactTrendingSnapshot.source_id, FactTrendingSnapshot.name, *dimensions.values()],
        )
    if dataset == "lineage":
        dimensions = {"videoType": BridgeVideoLineage.child_video_type}
        return _spec(
            BridgeVideoLineage.__table__,
            dimensions,
            {"recordCount": None},
            None,
            None,
            [BridgeVideoLineage.child_video_source_id, BridgeVideoLineage.parent_video_source_id, *dimensions.values()],
        )
    dimensions = {
        "date": AnalyticsDataQualityIssue.created_at,
        "sourceTable": AnalyticsDataQualityIssue.source_table,
        "issueCode": AnalyticsDataQualityIssue.issue_code,
        "severity": AnalyticsDataQualityIssue.severity,
    }
    return _spec(
        AnalyticsDataQualityIssue.__table__,
        dimensions,
        {"recordCount": None},
        AnalyticsDataQualityIssue.created_at,
        None,
        [AnalyticsDataQualityIssue.source_key, AnalyticsDataQualityIssue.details, *dimensions.values()],
    )


def _spec(from_clause: Any, dimensions: dict[str, Any], metrics: dict[str, Any], date_column: Any, deleted_column: Any, searchable: list[Any]) -> dict[str, Any]:
    return {"from": from_clause, "dimensions": dimensions, "metrics": metrics, "date": date_column, "deleted": deleted_column, "searchable": searchable}


def _warehouse_conditions(spec: dict[str, Any], request: WarehouseQueryRequest) -> list[Any]:
    conditions: list[Any] = []
    filters = request.filters
    start = _date(filters.dateStart)
    end = _date(filters.dateEnd)
    if start and spec["date"] is not None:
        conditions.append(or_(spec["date"].is_(None), func.date(spec["date"]) >= start))
    if end and spec["date"] is not None:
        conditions.append(or_(spec["date"].is_(None), func.date(spec["date"]) <= end))
    if not filters.includeDeleted and spec["deleted"] is not None:
        conditions.append(spec["deleted"].is_(False))
    for key in ("company", "channel", "user", "language", "videoType", "serviceType", "sourcePlatform", "publishPlatform", "status"):
        value = getattr(filters, key)
        if _active(value) and key in spec["dimensions"]:
            conditions.append(func.lower(cast(spec["dimensions"][key], String)) == value.lower())
    for key, value in request.dimensionFilters.items():
        if _active(value):
            conditions.append(func.lower(cast(spec["dimensions"][key], String)) == value.lower())
    if request.search:
        search_text = func.lower(func.concat_ws(" ", *[cast(value, String) for value in spec["searchable"]]))
        for term in request.search.lower().split():
            conditions.append(search_text.contains(term))
    return conditions


def _warehouse_metric_expression(spec: dict[str, Any], metric: WarehouseMetricRequest) -> Any:
    if metric.id == "recordCount":
        return func.count()
    if metric.id == "publishedCount":
        return func.count().filter(spec["metrics"][metric.id])
    if metric.id == "completionRate":
        return _warehouse_rate(spec["metrics"][metric.id], {"done", "completed"}, {"done", "completed", "error", "scheduled", "not_started", "in_progress", "queued"})
    if metric.id == "errorRate":
        return _warehouse_rate(spec["metrics"][metric.id], {"error"}, {"done", "completed", "error", "not_started", "in_progress", "queued"})
    value = spec["metrics"][metric.id]
    if metric.aggregation == "sum":
        return func.coalesce(func.sum(value), 0)
    if metric.aggregation == "min":
        return func.coalesce(func.min(value), 0)
    if metric.aggregation == "max":
        return func.coalesce(func.max(value), 0)
    if metric.aggregation == "count":
        return func.count(value)
    return func.coalesce(func.avg(value), 0)


def _warehouse_rate(status: Any, numerators: set[str], denominators: set[str]) -> Any:
    numerator = func.count().filter(status.in_(sorted(numerators)))
    denominator = func.count().filter(status.in_(sorted(denominators)))
    return func.coalesce(func.round(cast(numerator, Numeric) / func.nullif(denominator, 0) * 100, 2), 0)


def _serialize_mapping(mapping: Any) -> dict[str, Any]:
    return {
        key: value.isoformat() if isinstance(value, (date, datetime)) else float(value) if isinstance(value, Decimal) else value
        for key, value in mapping.items()
    }
