from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
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
from apps.api.app.schemas.analytics import AnalyticsFilterState, WarehouseMetricRequest, WarehouseQueryRequest


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

    async def latest_completed_load_run(self) -> AnalyticsLoadRun | None:
        return await self.session.scalar(
            select(AnalyticsLoadRun)
            .where(AnalyticsLoadRun.status == "completed")
            .order_by(desc(AnalyticsLoadRun.id))
            .limit(1)
        )

    async def get_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        return {
            **await self.get_video_summary_metrics(context),
            **await self.get_service_summary_metrics(context),
            **await self.get_publish_summary_metrics(context),
            **await self.get_clipcut_summary_metrics(context),
            **await self.get_quality_summary_metrics(),
        }

    async def get_video_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        is_original = func.lower(FactVideo.video_type) == "original"
        is_generated = func.lower(FactVideo.video_type) != "original"
        is_chapter = func.lower(FactVideo.video_type) == "chapters"
        is_mkm = func.lower(FactVideo.video_type) == "mykeymoments"
        is_viral = func.lower(FactVideo.video_type) == "viral"
        is_published = and_(FactVideo.status_raw != 2, FactVideo.published_raw == 1)
        classified = and_(is_original, FactVideo.status_label.in_(["done", "error"]))
        duration_minutes = func.round(cast(func.coalesce(FactVideo.duration_seconds, 0), Numeric) / 60, 2)
        processing_minutes = func.round(cast(FactVideo.total_time_taken_seconds, Numeric) / 60, 2)
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
            func.count().filter(is_chapter).label("chapters"),
            func.count().filter(is_mkm).label("mkm_videos"),
            func.count().filter(is_viral).label("viral_videos"),
            func.count().filter(FactVideo.is_billable.is_(False)).label("non_billable_videos"),
            func.coalesce(func.sum(case((is_original, duration_minutes), else_=literal(0, type_=Numeric))), 0).label("uploaded_duration"),
            func.coalesce(
                func.sum(
                    case(
                        (and_(is_original, FactVideo.status_label == "done"), processing_minutes),
                        else_=literal(0, type_=Numeric),
                    )
                ),
                0,
            ).label("processing_duration"),
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
            "avgProcessing": round(processing_duration / max(1, processed), 2),
            "videosIngested": videos_ingested,
            "generatedOutputs": generated_outputs,
            "processingSuccessRate": _rate(processed, classified_originals),
            "processingErrorRate": _rate(processing_errors, classified_originals),
            "processingBacklog": _int(row["processing_backlog"]),
            "processingTurnaround": round(processing_duration / max(1, processed), 2),
            "outputYield": round(generated_outputs / max(1, videos_ingested), 2),
            "metadataCompleteness": _rate(_int(row["present_metadata_fields"]), generated_outputs * 6),
            "chapters": _int(row["chapters"]),
            "mkmVideos": _int(row["mkm_videos"]),
            "viralVideos": _int(row["viral_videos"]),
            "nonBillableVideos": _int(row["non_billable_videos"]),
        }

    async def get_service_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        conditions = self._related_service_filters(context)
        classified = FactServiceRequest.status_label.in_(["done", "error"])
        completed = FactServiceRequest.status_label == "done"
        linked_video = FactServiceRequest.video_source_id.is_not(None)
        stuck_cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=24)
        service_timestamp = func.coalesce(
            FactServiceRequest.date_updated,
            FactServiceRequest.start_time,
            FactServiceRequest.date_added,
        )
        statement = select(
            func.count().filter(and_(classified, completed)).label("completed"),
            func.count().filter(classified).label("classified"),
            func.count().filter(FactServiceRequest.status_label.in_(["queued", "in_progress"])).label("backlog"),
            func.count().filter(FactServiceRequest.status_label == "error").label("errors"),
            func.coalesce(func.avg(FactServiceRequest.duration_seconds).filter(completed), 0).label("average_latency"),
            func.count()
            .filter(
                and_(
                    FactServiceRequest.status_label.in_(["queued", "in_progress"]),
                    service_timestamp < stuck_cutoff,
                )
            )
            .label("stuck_jobs"),
            func.count(func.distinct(FactServiceRequest.video_source_id))
            .filter(and_(linked_video, completed, FactServiceRequest.service_type == "reels"))
            .label("reels"),
            func.count(func.distinct(FactServiceRequest.video_source_id))
            .filter(and_(linked_video, completed, FactServiceRequest.service_type == "shorts"))
            .label("shorts_videos"),
            func.count(func.distinct(FactServiceRequest.video_source_id))
            .filter(and_(linked_video, FactServiceRequest.video_replaced_count > 0))
            .label("replaced_videos"),
        ).where(*conditions)
        row = (await self.session.execute(statement)).one()._mapping
        return {
            "serviceCompletionRate": _rate(_int(row["completed"]), _int(row["classified"])),
            "serviceBacklog": _int(row["backlog"]),
            "averageServiceLatency": round(_float(row["average_latency"]) / 60, 2),
            "serviceErrorRate": _rate(_int(row["errors"]), _int(row["classified"])),
            "serviceErrorVolume": _int(row["errors"]),
            "stuckServiceJobs24h": _int(row["stuck_jobs"]),
            "reels": _int(row["reels"]),
            "shortsVideos": _int(row["shorts_videos"]),
            "replacedVideos": _int(row["replaced_videos"]),
        }

    async def get_publish_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        conditions = self._related_schedule_filters(context)
        classified = FactPublishSchedule.status_label.in_(["completed", "scheduled"])
        statement = select(
            func.count().filter(and_(classified, FactPublishSchedule.status_label == "completed")).label("completed"),
            func.count().filter(classified).label("classified"),
        ).where(*conditions)
        row = (await self.session.execute(statement)).one()._mapping
        return {
            "publishScheduleCompletionRate": _rate(_int(row["completed"]), _int(row["classified"])),
            "publishThroughput": _int(row["completed"]),
        }

    async def get_clipcut_summary_metrics(self, context: dict[str, Any] | None) -> dict[str, float]:
        conditions = self._related_clipcut_filters(context)
        classified = FactClipcutRequest.status_label.in_(["done", "error", "not_started", "in_progress"])
        statement = select(
            func.count().filter(and_(classified, FactClipcutRequest.status_label == "done")).label("completed"),
            func.count().filter(classified).label("classified"),
        ).where(*conditions)
        row = (await self.session.execute(statement)).one()._mapping
        return {"clipcutCompletionRate": _rate(_int(row["completed"]), _int(row["classified"]))}

    async def get_quality_summary_metrics(self) -> dict[str, float]:
        latest = await self.latest_completed_load_run()
        if not latest:
            return {"recordedQualityIssues": 0}
        issue_count = await self.session.scalar(
            select(func.count())
            .select_from(AnalyticsDataQualityIssue)
            .where(AnalyticsDataQualityIssue.load_run_id == latest.id)
        )
        return {"recordedQualityIssues": _int(issue_count)}

    async def get_time_trend(self, context: dict[str, Any] | None, grain: str = "day") -> list[dict[str, Any]]:
        is_original = func.lower(FactVideo.video_type) == "original"
        base_conditions = self._video_filter_conditions(context)
        duration_minutes = cast(func.coalesce(FactVideo.duration_seconds, 0), Numeric) / 60
        processing_minutes = cast(func.coalesce(FactVideo.total_time_taken_seconds, 0), Numeric) / 60

        async def grouped_rows(bucket: Any, fields: dict[str, Any], conditions: list[Any]) -> list[Any]:
            statement = (
                select(bucket.label("bucket"), *[expression.label(name) for name, expression in fields.items()])
                .select_from(FactVideo)
                .outerjoin(DimCompany, DimCompany.source_id == FactVideo.company_source_id)
                .outerjoin(DimChannel, DimChannel.source_id == FactVideo.channel_source_id)
                .outerjoin(DimUser, DimUser.source_id == FactVideo.user_source_id)
                .where(*base_conditions, *conditions)
                .group_by(bucket)
            )
            return list((await self.session.execute(statement)).all())

        uploaded_bucket = _time_bucket(FactVideo.date_added, grain)
        processed_bucket = _time_bucket(func.coalesce(FactVideo.process_end, FactVideo.date_added), grain)
        published_bucket = _time_bucket(FactVideo.date_added, grain)
        grouped: dict[str, dict[str, Any]] = {}

        for row in await grouped_rows(
            uploaded_bucket,
            {"uploaded": func.count(), "uploadedDuration": func.coalesce(func.sum(duration_minutes), 0)},
            [is_original],
        ):
            item = _time_row(grouped, row._mapping["bucket"], grain)
            item["uploaded"] = _int(row._mapping["uploaded"])
            item["uploadedDuration"] = round(_float(row._mapping["uploadedDuration"]), 2)

        for row in await grouped_rows(
            processed_bucket,
            {"processed": func.count(), "processedDuration": func.coalesce(func.sum(processing_minutes), 0)},
            [is_original, FactVideo.status_label == "done"],
        ):
            item = _time_row(grouped, row._mapping["bucket"], grain)
            item["processed"] = _int(row._mapping["processed"])
            item["processedDuration"] = round(_float(row._mapping["processedDuration"]), 2)

        for row in await grouped_rows(
            published_bucket,
            {"published": func.count(), "publishedDuration": func.coalesce(func.sum(duration_minutes), 0)},
            [FactVideo.status_raw != 2, FactVideo.published_raw == 1],
        ):
            item = _time_row(grouped, row._mapping["bucket"], grain)
            item["published"] = _int(row._mapping["published"])
            item["publishedDuration"] = round(_float(row._mapping["publishedDuration"]), 2)

        return [
            {key: value for key, value in row.items() if key != "_sort"}
            for row in sorted(grouped.values(), key=lambda item: item["_sort"])
        ]

    async def get_channel_performance(self, context: dict[str, Any] | None) -> list[dict[str, Any]]:
        is_original = func.lower(FactVideo.video_type) == "original"
        is_published = and_(FactVideo.status_raw != 2, FactVideo.published_raw == 1)
        channel = _dimension_name(DimChannel.name, "Unknown channel", FactVideo.channel_source_id)
        duration_minutes = cast(func.coalesce(FactVideo.duration_seconds, 0), Numeric) / 60
        processing_minutes = cast(func.coalesce(FactVideo.total_time_taken_seconds, 0), Numeric) / 60
        statement = (
            select(
                channel.label("channel"),
                func.count().filter(is_original).label("uploaded"),
                func.count().filter(and_(is_original, FactVideo.status_label == "done")).label("processed"),
                func.count().filter(is_published).label("published"),
                func.coalesce(func.sum(case((is_original, duration_minutes), else_=literal(0, type_=Numeric))), 0).label("uploadedDuration"),
                func.coalesce(func.sum(case((and_(is_original, FactVideo.status_label == "done"), processing_minutes), else_=literal(0, type_=Numeric))), 0).label("processedDuration"),
                func.coalesce(func.sum(case((is_published, duration_minutes), else_=literal(0, type_=Numeric))), 0).label("publishedDuration"),
            )
            .select_from(FactVideo)
            .outerjoin(DimCompany, DimCompany.source_id == FactVideo.company_source_id)
            .outerjoin(DimChannel, DimChannel.source_id == FactVideo.channel_source_id)
            .outerjoin(DimUser, DimUser.source_id == FactVideo.user_source_id)
            .where(*self._video_filter_conditions(context))
            .group_by(channel)
            .order_by(desc(func.count().filter(is_published)))
        )
        return [_serialize_mapping(row._mapping) for row in (await self.session.execute(statement)).all()]

    async def get_platform_distribution(self, context: dict[str, Any] | None) -> list[dict[str, Any]]:
        channel = _dimension_name(DimChannel.name, "Unknown channel", FactVideo.channel_source_id)
        platform = func.coalesce(FactVideo.source_url_type, "Unknown")
        duration_minutes = cast(func.coalesce(FactVideo.duration_seconds, 0), Numeric) / 60
        statement = (
            select(
                channel.label("channel"),
                platform.label("platform"),
                func.count().label("count"),
                func.coalesce(func.sum(duration_minutes), 0).label("duration"),
            )
            .select_from(FactVideo)
            .outerjoin(DimCompany, DimCompany.source_id == FactVideo.company_source_id)
            .outerjoin(DimChannel, DimChannel.source_id == FactVideo.channel_source_id)
            .outerjoin(DimUser, DimUser.source_id == FactVideo.user_source_id)
            .where(*self._video_filter_conditions(context))
            .group_by(channel, platform)
            .order_by(channel, desc(func.count()))
        )
        rows: dict[str, dict[str, Any]] = {}
        for result in (await self.session.execute(statement)).all():
            row = result._mapping
            item = rows.setdefault(str(row["channel"]), {"channel": row["channel"]})
            key = _metric_key(row["platform"])
            item[f"{key}-count"] = _int(row["count"])
            item[f"{key}-duration"] = round(_float(row["duration"]), 2)
        return list(rows.values())

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

    async def list_warehouse_query_rows(self, request: WarehouseQueryRequest) -> list[dict[str, Any]]:
        spec = _warehouse_spec(request.dataset)
        rows = spec["rows"]
        invalid_filters = set(request.dimensionFilters) - set(spec["dimensions"])
        if invalid_filters:
            raise ValueError(f"Unsupported dimension filters for {request.dataset}: {sorted(invalid_filters)}")

        statement = (
            select(*[expression.label(name) for name, expression in rows.items()])
            .select_from(spec["from"])
            .where(*_warehouse_conditions(spec, request))
        )
        sort_key = request.sortBy or ""
        sort_expression = rows.get(sort_key)
        if sort_expression is None:
            sort_expression = spec["dimensions"].get(sort_key)
        if sort_expression is None:
            sort_expression = rows.get("date")
        if sort_expression is not None:
            statement = statement.order_by(desc(sort_expression) if request.sortDirection == "desc" else sort_expression)
        statement = statement.limit(request.limit)
        return [_serialize_mapping(row._mapping) for row in (await self.session.execute(statement)).all()]

    async def count_warehouse_query_rows(self, request: WarehouseQueryRequest, *, filtered: bool) -> int:
        spec = _warehouse_spec(request.dataset)
        count_request = request if filtered else WarehouseQueryRequest(dataset=request.dataset, filters=AnalyticsFilterState())
        statement = select(func.count()).select_from(spec["from"]).where(*_warehouse_conditions(spec, count_request))
        return _int(await self.session.scalar(statement))

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
        conditions = _dataset_date_conditions(
            context,
            func.coalesce(FactServiceRequest.end_time, FactServiceRequest.date_added),
        )
        video_context = _related_video_context(context, {"serviceType", "status"})
        if _has_active_filters(video_context):
            conditions.append(
                exists(
                    self._with_video_filters(
                        select(FactVideo.source_id).where(FactVideo.source_id == FactServiceRequest.video_source_id),
                        video_context,
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
        conditions = _dataset_date_conditions(context, FactPublishSchedule.scheduled_time)
        video_context = _related_video_context(context, {"publishPlatform", "status"})
        if _has_active_filters(video_context):
            conditions.append(
                exists(
                    self._with_video_filters(
                        select(FactVideo.source_id).where(FactVideo.video_md5 == FactPublishSchedule.video_md5),
                        video_context,
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
        conditions = _dataset_date_conditions(context, FactClipcutRequest.created_at)
        video_context = _related_video_context(context, {"status"})
        if _has_active_filters(video_context):
            conditions.append(
                exists(
                    self._with_video_filters(
                        select(FactVideo.source_id).where(FactVideo.video_md5 == FactClipcutRequest.video_md5),
                        video_context,
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


def _related_video_context(
    context: dict[str, Any] | None,
    ignored_filters: set[str],
) -> dict[str, Any] | None:
    if not context:
        return None
    filters = {
        key: value
        for key, value in context.get("filters", {}).items()
        if key not in ignored_filters
    }
    return {"filters": filters, "dateRange": {}}


def _dataset_date_conditions(context: dict[str, Any] | None, column: Any) -> list[Any]:
    date_range = (context or {}).get("dateRange", {})
    conditions: list[Any] = []
    start = _date(date_range.get("start"))
    end = _date(date_range.get("end"))
    if start:
        conditions.append(func.date(column) >= start)
    if end:
        conditions.append(func.date(column) <= end)
    return conditions


def _time_bucket(column: Any, grain: str) -> Any:
    if grain == "month":
        return func.to_char(column, "YYYY-MM")
    if grain == "year":
        return func.to_char(column, "YYYY")
    return func.date(column)


def _time_row(rows: dict[str, dict[str, Any]], bucket: Any, grain: str) -> dict[str, Any]:
    sort_key = bucket.isoformat() if isinstance(bucket, (date, datetime)) else str(bucket)
    label = _time_label(sort_key, grain)
    return rows.setdefault(
        sort_key,
        {
            "label": label,
            "_sort": sort_key,
            "uploaded": 0,
            "processed": 0,
            "published": 0,
            "uploadedDuration": 0,
            "processedDuration": 0,
            "publishedDuration": 0,
        },
    )


def _time_label(sort_key: str, grain: str) -> str:
    if grain == "year":
        return sort_key
    if grain == "month":
        parsed = datetime.strptime(sort_key, "%Y-%m")
        return parsed.strftime("%B %Y")
    parsed = datetime.fromisoformat(sort_key[:10])
    return f"{parsed.strftime('%b')} {parsed.day}"


def _metric_key(value: Any) -> str:
    return str(value or "Unknown").strip() or "Unknown"


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
    processing_turnaround_bucket = case(
        (FactVideo.total_time_taken_seconds.is_(None), "Unknown"),
        (FactVideo.total_time_taken_seconds < 60, "<1m"),
        (FactVideo.total_time_taken_seconds <= 300, "1-5m"),
        (FactVideo.total_time_taken_seconds <= 900, "5-15m"),
        (FactVideo.total_time_taken_seconds <= 3600, "15-60m"),
        else_=">60m",
    )
    video_dimensions = {
        "date": func.date(FactVideo.date_added),
        "company": company,
        "channel": channel,
        "user": user,
        "language": func.coalesce(FactVideo.language, "Unknown"),
        "videoType": FactVideo.video_type,
        "sourcePlatform": func.coalesce(FactVideo.source_url_type, "Unknown"),
        "processingTurnaroundBucket": processing_turnaround_bucket,
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
                "outputYield": FactVideo.video_type,
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
            {
                "id": FactVideo.source_id,
                "date": video_dimensions["date"],
                "company": company,
                "channel": channel,
                "user": user,
                "language": video_dimensions["language"],
                "videoType": FactVideo.video_type,
                "sourcePlatform": video_dimensions["sourcePlatform"],
                "status": FactVideo.status_label,
                "published": case((FactVideo.published_raw == 1, True), else_=False),
                "deleted": FactVideo.is_deleted,
                "headline": func.coalesce(FactVideo.headline, FactVideo.filename, func.concat("Video ", cast(FactVideo.source_id, String))),
                "videoMd5": FactVideo.video_md5,
                "durationSeconds": FactVideo.duration_seconds,
                "processingSeconds": FactVideo.total_time_taken_seconds,
                "processingTurnaroundBucket": processing_turnaround_bucket,
                "metadataCompleteness": metadata_completeness,
                "parentVideoId": FactVideo.parent_source_video_id,
            },
        )

    joined_video = FactVideo.__table__.outerjoin(DimCompany, DimCompany.source_id == FactVideo.company_source_id).outerjoin(
        DimChannel, DimChannel.source_id == FactVideo.channel_source_id
    ).outerjoin(DimUser, DimUser.source_id == FactVideo.user_source_id)
    if dataset == "serviceRequests":
        dimensions = {**video_dimensions, "date": func.date(FactServiceRequest.date_added), "serviceType": FactServiceRequest.service_type, "status": FactServiceRequest.status_label}
        return _spec(
            FactServiceRequest.__table__.outerjoin(joined_video, FactVideo.source_id == FactServiceRequest.video_source_id),
            dimensions,
            {"recordCount": None, "durationSeconds": FactServiceRequest.duration_seconds, "completionRate": FactServiceRequest.status_label, "errorRate": FactServiceRequest.status_label},
            FactServiceRequest.date_added,
            None,
            [FactServiceRequest.source_id, FactServiceRequest.video_source_id, FactServiceRequest.initiated_by, *dimensions.values()],
            {
                "id": FactServiceRequest.source_id,
                "date": dimensions["date"],
                "videoId": FactServiceRequest.video_source_id,
                "company": dimensions["company"],
                "channel": dimensions["channel"],
                "user": dimensions["user"],
                "language": dimensions["language"],
                "videoType": dimensions["videoType"],
                "sourcePlatform": dimensions["sourcePlatform"],
                "serviceType": FactServiceRequest.service_type,
                "initiatedBy": FactServiceRequest.initiated_by,
                "status": FactServiceRequest.status_label,
                "durationSeconds": FactServiceRequest.duration_seconds,
                "published": case((FactServiceRequest.published_raw == 1, True), else_=False),
            },
        )
    if dataset == "publishSchedules":
        dimensions = {**{key: value for key, value in video_dimensions.items() if key not in {"date", "status"}}, "date": func.date(FactPublishSchedule.scheduled_time), "publishPlatform": FactPublishSchedule.publish_platform, "status": FactPublishSchedule.status_label}
        return _spec(
            FactPublishSchedule.__table__.outerjoin(joined_video, FactVideo.video_md5 == FactPublishSchedule.video_md5),
            dimensions,
            {"recordCount": None, "completionRate": FactPublishSchedule.status_label},
            FactPublishSchedule.scheduled_time,
            FactPublishSchedule.is_deleted,
            [FactPublishSchedule.source_id, FactPublishSchedule.video_md5, *dimensions.values()],
            {
                "id": FactPublishSchedule.source_id,
                "date": dimensions["date"],
                "videoMd5": FactPublishSchedule.video_md5,
                "company": dimensions["company"],
                "channel": dimensions["channel"],
                "user": dimensions["user"],
                "publishPlatform": FactPublishSchedule.publish_platform,
                "status": FactPublishSchedule.status_label,
                "deleted": FactPublishSchedule.is_deleted,
            },
        )
    if dataset == "clipcutRequests":
        clipcut_user = DimUser.__table__.alias("clipcut_user")
        dimensions = {
            **video_dimensions,
            "date": func.date(FactClipcutRequest.created_at),
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
            {
                "id": FactClipcutRequest.source_id,
                "date": dimensions["date"],
                "videoMd5": FactClipcutRequest.video_md5,
                "company": dimensions["company"],
                "channel": dimensions["channel"],
                "user": dimensions["user"],
                "language": dimensions["language"],
                "videoType": dimensions["videoType"],
                "sourcePlatform": dimensions["sourcePlatform"],
                "aspectRatio": FactClipcutRequest.aspect_ratio_type,
                "seriesName": FactClipcutRequest.series_name,
                "status": FactClipcutRequest.status_label,
            },
        )
    if dataset == "trendingSnapshots":
        dimensions = {"date": func.date(FactTrendingSnapshot.trending_at), "trendType": FactTrendingSnapshot.trend_type, "country": func.coalesce(FactTrendingSnapshot.country, "Unknown")}
        return _spec(
            FactTrendingSnapshot.__table__,
            dimensions,
            {"recordCount": None, "rankOrder": FactTrendingSnapshot.rank_order},
            FactTrendingSnapshot.trending_at,
            None,
            [FactTrendingSnapshot.source_id, FactTrendingSnapshot.name, *dimensions.values()],
            {
                "id": FactTrendingSnapshot.source_id,
                "date": dimensions["date"],
                "name": FactTrendingSnapshot.name,
                "trendType": FactTrendingSnapshot.trend_type,
                "country": dimensions["country"],
                "rankOrder": FactTrendingSnapshot.rank_order,
                "status": literal("snapshot"),
            },
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
            {
                "id": BridgeVideoLineage.child_video_source_id,
                "childVideoId": BridgeVideoLineage.child_video_source_id,
                "parentVideoId": BridgeVideoLineage.parent_video_source_id,
                "videoType": BridgeVideoLineage.child_video_type,
                "status": literal("linked"),
            },
        )
    dimensions = {
        "date": func.date(AnalyticsDataQualityIssue.created_at),
        "loadRun": AnalyticsDataQualityIssue.load_run_id,
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
        {
            "id": AnalyticsDataQualityIssue.id,
            "date": dimensions["date"],
            "loadRun": AnalyticsDataQualityIssue.load_run_id,
            "sourceTable": AnalyticsDataQualityIssue.source_table,
            "sourceKey": AnalyticsDataQualityIssue.source_key,
            "issueCode": AnalyticsDataQualityIssue.issue_code,
            "severity": AnalyticsDataQualityIssue.severity,
            "status": AnalyticsDataQualityIssue.issue_code,
            "details": AnalyticsDataQualityIssue.details,
        },
    )


def _spec(
    from_clause: Any,
    dimensions: dict[str, Any],
    metrics: dict[str, Any],
    date_column: Any,
    deleted_column: Any,
    searchable: list[Any],
    rows: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "from": from_clause,
        "dimensions": dimensions,
        "metrics": metrics,
        "date": date_column,
        "deleted": deleted_column,
        "searchable": searchable,
        "rows": rows or dimensions,
    }


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
    if metric.id == "outputYield":
        video_type = spec["metrics"][metric.id]
        generated = func.count().filter(func.lower(video_type) != "original")
        originals = func.count().filter(func.lower(video_type) == "original")
        return func.coalesce(func.round(cast(generated, Numeric) / func.nullif(originals, 0), 2), 0)
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
