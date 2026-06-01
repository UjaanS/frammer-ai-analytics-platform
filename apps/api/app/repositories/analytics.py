from __future__ import annotations

from sqlalchemy import Select, desc, select
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
