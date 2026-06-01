from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from apps.api.app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class AnalyticsLoadRun(Base):
    __tablename__ = "analytics_load_run"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_checksum: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    source_file: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    row_counts: Mapped[dict] = mapped_column(JSON, default=dict)
    rejected_count: Mapped[int] = mapped_column(Integer, default=0)
    issue_count: Mapped[int] = mapped_column(Integer, default=0)


class DimCompany(Base):
    __tablename__ = "dim_company"

    source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    status_raw: Mapped[int | None] = mapped_column(Integer, nullable=True)


class DimChannel(Base):
    __tablename__ = "dim_channel"

    source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_source_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    status_raw: Mapped[int | None] = mapped_column(Integer, nullable=True)


class DimUser(Base):
    __tablename__ = "dim_user"

    source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    status_raw: Mapped[int | None] = mapped_column(Integer, nullable=True)


class FactVideo(Base):
    __tablename__ = "fact_video"

    source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_source_id: Mapped[int] = mapped_column(Integer, index=True)
    company_source_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    channel_source_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    video_md5: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    headline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url_type: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    source_url_present: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[str | None] = mapped_column(String(250), nullable=True, index=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status_raw: Mapped[int] = mapped_column(Integer, index=True)
    status_label: Mapped[str] = mapped_column(String(64), index=True)
    date_added: Mapped[datetime] = mapped_column(DateTime, index=True)
    date_updated: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    process_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    process_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    total_time_taken_seconds: Mapped[int] = mapped_column(Integer, default=0)
    parent_source_video_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    video_type: Mapped[str] = mapped_column(String(200), index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    published_raw: Mapped[int] = mapped_column(Integer, default=0, index=True)
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_caption_present: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_hashtag_present: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_synopsis_present: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_subtitles_present: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_thumbnails_present: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_characters_present: Mapped[bool] = mapped_column(Boolean, default=False)


class FactServiceRequest(Base):
    __tablename__ = "fact_service_request"

    source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_source_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    service_type: Mapped[str] = mapped_column(String(255), index=True)
    initiated_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    status_raw: Mapped[int] = mapped_column(Integer, index=True)
    status_label: Mapped[str] = mapped_column(String(64), index=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    date_added: Mapped[datetime] = mapped_column(DateTime, index=True)
    date_updated: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    published_raw: Mapped[int] = mapped_column(Integer, default=0)


class FactPublishSchedule(Base):
    __tablename__ = "fact_publish_schedule"

    source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_source_id: Mapped[int] = mapped_column(Integer, index=True)
    company_source_id: Mapped[int] = mapped_column(Integer, index=True)
    channel_source_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    video_md5: Mapped[str] = mapped_column(String(255), index=True)
    status_raw: Mapped[int] = mapped_column(Integer, index=True)
    status_label: Mapped[str] = mapped_column(String(64), index=True)
    publish_platform: Mapped[str] = mapped_column(String(150), index=True)
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    destination_source_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class FactClipcutRequest(Base):
    __tablename__ = "fact_clipcut_request"

    source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_source_id: Mapped[int] = mapped_column(Integer, index=True)
    video_md5: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    aspect_ratio_type: Mapped[str | None] = mapped_column(String(15), nullable=True)
    series_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status_raw: Mapped[int] = mapped_column(Integer, index=True)
    status_label: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class FactTrendingSnapshot(Base):
    __tablename__ = "fact_trending_snapshot"

    source_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    trend_type: Mapped[str] = mapped_column(String(100), index=True)
    trending_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rank_order: Mapped[int | None] = mapped_column(Integer, nullable=True)


class BridgeVideoLineage(Base):
    __tablename__ = "bridge_video_lineage"

    child_video_source_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_video_source_id: Mapped[int] = mapped_column(Integer, index=True)
    child_video_type: Mapped[str] = mapped_column(String(200), index=True)


class AnalyticsDataQualityIssue(Base):
    __tablename__ = "analytics_data_quality_issue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    load_run_id: Mapped[int] = mapped_column(ForeignKey("analytics_load_run.id", ondelete="CASCADE"), index=True)
    source_table: Mapped[str] = mapped_column(String(100), index=True)
    source_key: Mapped[str] = mapped_column(String(255), index=True)
    issue_code: Mapped[str] = mapped_column(String(100), index=True)
    severity: Mapped[str] = mapped_column(String(32), default="warning")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
