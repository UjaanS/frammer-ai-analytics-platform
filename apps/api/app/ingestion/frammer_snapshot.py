from __future__ import annotations

import argparse
import asyncio
import hashlib
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.db.session import AsyncSessionLocal
from apps.api.app.ingestion.sql_dump import read_selected_inserts
from apps.api.app.models.analytics import (
    AnalyticsDataQualityIssue,
    AnalyticsLoadRun,
    BridgeVideoLineage,
    DimChannel,
    DimCompany,
    DimUser,
    FactClipcutRequest,
    FactPublishSchedule,
    FactServiceRequest,
    FactTrendingSnapshot,
    FactVideo,
)


SAFE_COLUMNS = {
    "company": {"id", "name", "status"},
    "channel": {"id", "company_id", "name", "status"},
    "users": {"id", "name", "status"},
    "videos": {
        "id",
        "user_id",
        "company_id",
        "channel_id",
        "video_md5",
        "url",
        "headline",
        "filename",
        "language",
        "duration",
        "status",
        "date_added",
        "date_updated",
        "process_start",
        "process_end",
        "parent_video_id",
        "video_type",
        "url_type",
        "total_time_taken",
        "is_deleted",
        "published",
        "is_billable",
    },
    "services_requested": {
        "id",
        "video_id",
        "service_type_id",
        "initiated_by",
        "start_time",
        "end_time",
        "status",
        "duration",
        "date_added",
        "date_updated",
        "published",
    },
    "md_child_metadata": {
        "video_id",
        "caption",
        "hashtag",
        "synopsis",
        "subtitles",
        "thumbnails",
        "characters",
    },
    "video_publish_schedulers": {
        "id",
        "user_id",
        "company_id",
        "channel_id",
        "video_id",
        "status",
        "platform_type",
        "scheduled_time",
        "destination_id",
        "is_deleted",
    },
    "video_clipcut_club_requests": {
        "request_id",
        "user_id",
        "video_md5",
        "aspect_ratio_type",
        "series_name",
        "status",
        "create_time",
        "update_time",
    },
    "trendings": {"id", "name", "type", "trending_date", "country", "orders"},
}

VIDEO_STATUS = {0: "not_started", 1: "in_progress", 2: "error", 3: "done", 4: "deleted"}
SERVICE_STATUS = {0: "queued", 1: "in_progress", 2: "error", 3: "done", 4: "deleted"}
CLIPCUT_STATUS = VIDEO_STATUS
SCHEDULE_STATUS = {0: "scheduled", 2: "completed"}


@dataclass
class SnapshotBundle:
    companies: list[dict[str, Any]] = field(default_factory=list)
    channels: list[dict[str, Any]] = field(default_factory=list)
    users: list[dict[str, Any]] = field(default_factory=list)
    videos: list[dict[str, Any]] = field(default_factory=list)
    services: list[dict[str, Any]] = field(default_factory=list)
    schedules: list[dict[str, Any]] = field(default_factory=list)
    clipcuts: list[dict[str, Any]] = field(default_factory=list)
    trendings: list[dict[str, Any]] = field(default_factory=list)
    lineage: list[dict[str, Any]] = field(default_factory=list)
    issues: list[dict[str, Any]] = field(default_factory=list)

    def row_counts(self) -> dict[str, int]:
        return {
            "dim_company": len(self.companies),
            "dim_channel": len(self.channels),
            "dim_user": len(self.users),
            "fact_video": len(self.videos),
            "fact_service_request": len(self.services),
            "fact_publish_schedule": len(self.schedules),
            "fact_clipcut_request": len(self.clipcuts),
            "fact_trending_snapshot": len(self.trendings),
            "bridge_video_lineage": len(self.lineage),
        }


def build_snapshot(path: Path) -> SnapshotBundle:
    rows = read_selected_inserts(path, SAFE_COLUMNS)
    bundle = SnapshotBundle()
    metadata_by_video = {
        _int(row["video_id"]): {
            "metadata_caption_present": bool(row.get("caption")),
            "metadata_hashtag_present": bool(row.get("hashtag")),
            "metadata_synopsis_present": bool(row.get("synopsis")),
            "metadata_subtitles_present": bool(row.get("subtitles")),
            "metadata_thumbnails_present": bool(row.get("thumbnails")),
            "metadata_characters_present": bool(row.get("characters")),
        }
        for row in rows["md_child_metadata"]
    }

    bundle.companies = [
        {"source_id": _int(row["id"]), "name": row["name"] or "Unknown", "status_raw": _int_or_none(row.get("status"))}
        for row in rows["company"]
    ]
    bundle.channels = [
        {
            "source_id": _int(row["id"]),
            "company_source_id": _int_or_none(row.get("company_id")),
            "name": row["name"] or "Unknown",
            "status_raw": _int_or_none(row.get("status")),
        }
        for row in rows["channel"]
    ]
    bundle.users = [
        {"source_id": _int(row["id"]), "name": row["name"] or "Unknown", "status_raw": _int_or_none(row.get("status"))}
        for row in rows["users"]
    ]

    for row in rows["videos"]:
        status_raw = _int(row["status"])
        parent_id = _id_or_none(row.get("parent_video_id"))
        fact = {
            "source_id": _int(row["id"]),
            "user_source_id": _int(row["user_id"]),
            "company_source_id": _int_or_none(row.get("company_id")),
            "channel_source_id": _int_or_none(row.get("channel_id")),
            "video_md5": row["video_md5"] or "",
            "headline": row.get("headline"),
            "filename": row.get("filename"),
            "source_url_type": _normalize_text(row.get("url_type")),
            "source_url_present": bool(row.get("url")),
            "language": _normalize_text(row.get("language")),
            "duration_seconds": _int_or_none(row.get("duration")),
            "status_raw": status_raw,
            "status_label": _status_label(VIDEO_STATUS, status_raw),
            "date_added": _datetime(row.get("date_added")) or _utcnow(),
            "date_updated": _datetime(row.get("date_updated")),
            "process_start": _datetime(row.get("process_start")),
            "process_end": _datetime(row.get("process_end")),
            "total_time_taken_seconds": _int(row.get("total_time_taken"), 0),
            "parent_source_video_id": parent_id,
            "video_type": _normalize_text(row.get("video_type")) or "original",
            "is_deleted": _bool(row.get("is_deleted")),
            "published_raw": _int(row.get("published"), 0),
            "is_billable": _bool(row.get("is_billable"), True),
            **metadata_by_video.get(
                _int(row["id"]),
                {
                    "metadata_caption_present": False,
                    "metadata_hashtag_present": False,
                    "metadata_synopsis_present": False,
                    "metadata_subtitles_present": False,
                    "metadata_thumbnails_present": False,
                    "metadata_characters_present": False,
                },
            ),
        }
        bundle.videos.append(fact)
        if parent_id is not None:
            bundle.lineage.append(
                {
                    "child_video_source_id": fact["source_id"],
                    "parent_video_source_id": parent_id,
                    "child_video_type": fact["video_type"],
                }
            )
        if status_raw not in VIDEO_STATUS:
            bundle.issues.append(_issue("videos", row["id"], "unknown_video_status", {"status": status_raw}))
        if fact["published_raw"] not in {0, 1}:
            bundle.issues.append(_issue("videos", row["id"], "unknown_published_value", {"published": fact["published_raw"]}))

    for row in rows["services_requested"]:
        status_raw = _int(row["status"])
        video_id = _id_or_none(row.get("video_id"))
        bundle.services.append(
            {
                "source_id": _int(row["id"]),
                "video_source_id": video_id,
                "service_type": _normalize_text(row.get("service_type_id")) or "unknown",
                "initiated_by": _normalize_text(row.get("initiated_by")),
                "start_time": _datetime(row.get("start_time")),
                "end_time": _datetime(row.get("end_time")),
                "status_raw": status_raw,
                "status_label": _status_label(SERVICE_STATUS, status_raw),
                "duration_seconds": _int_or_none(row.get("duration")),
                "date_added": _datetime(row.get("date_added")) or _utcnow(),
                "date_updated": _datetime(row.get("date_updated")),
                "published_raw": _int(row.get("published"), 0),
            }
        )
        if video_id is None:
            bundle.issues.append(_issue("services_requested", row["id"], "sentinel_video_id", {"video_id": row.get("video_id")}))
        if status_raw not in SERVICE_STATUS:
            bundle.issues.append(_issue("services_requested", row["id"], "unknown_service_status", {"status": status_raw}))

    for row in rows["video_publish_schedulers"]:
        status_raw = _int(row["status"])
        raw_platform = row.get("platform_type") or "unknown"
        platform = _normalize_text(raw_platform) or "unknown"
        bundle.schedules.append(
            {
                "source_id": _int(row["id"]),
                "user_source_id": _int(row["user_id"]),
                "company_source_id": _int(row["company_id"]),
                "channel_source_id": _id_or_none(row.get("channel_id")),
                "video_md5": row.get("video_id") or "",
                "status_raw": status_raw,
                "status_label": _status_label(SCHEDULE_STATUS, status_raw),
                "publish_platform": platform,
                "scheduled_time": _datetime(row.get("scheduled_time")),
                "destination_source_id": _id_or_none(row.get("destination_id")),
                "is_deleted": _bool(row.get("is_deleted")),
            }
        )
        if raw_platform != platform:
            bundle.issues.append(_issue("video_publish_schedulers", row["id"], "normalized_publish_platform", {"raw": raw_platform, "normalized": platform}))

    for row in rows["video_clipcut_club_requests"]:
        status_raw = _int(row.get("status"), 0)
        bundle.clipcuts.append(
            {
                "source_id": _int(row["request_id"]),
                "user_source_id": _int(row["user_id"]),
                "video_md5": row.get("video_md5"),
                "aspect_ratio_type": row.get("aspect_ratio_type"),
                "series_name": row.get("series_name"),
                "status_raw": status_raw,
                "status_label": _status_label(CLIPCUT_STATUS, status_raw),
                "created_at": _datetime(row.get("create_time")) or _utcnow(),
                "updated_at": _datetime(row.get("update_time")),
            }
        )

    bundle.trendings = [
        {
            "source_id": _int(row["id"]),
            "name": row.get("name") or "Unknown",
            "trend_type": _normalize_text(row.get("type")) or "unknown",
            "trending_at": _datetime(row.get("trending_date")) or _utcnow(),
            "country": _normalize_text(row.get("country")),
            "rank_order": _int_or_none(row.get("orders")),
        }
        for row in rows["trendings"]
    ]

    _record_orphans(bundle)
    return bundle


async def import_snapshot(path: Path) -> AnalyticsLoadRun:
    checksum = hashlib.sha256(path.read_bytes()).hexdigest()
    async with AsyncSessionLocal() as session:
        existing = await session.scalar(select(AnalyticsLoadRun).where(AnalyticsLoadRun.source_checksum == checksum))
        if existing:
            return existing

        load_run = AnalyticsLoadRun(source_checksum=checksum, source_file=path.name)
        session.add(load_run)
        await session.flush()

        try:
            bundle = build_snapshot(path)
            await _upsert(session, DimCompany, bundle.companies)
            await _upsert(session, DimChannel, bundle.channels)
            await _upsert(session, DimUser, bundle.users)
            await _upsert(session, FactVideo, bundle.videos)
            await _upsert(session, FactServiceRequest, bundle.services)
            await _upsert(session, FactPublishSchedule, bundle.schedules)
            await _upsert(session, FactClipcutRequest, bundle.clipcuts)
            await _upsert(session, FactTrendingSnapshot, bundle.trendings)
            await _upsert(session, BridgeVideoLineage, bundle.lineage)
            session.add_all(
                [AnalyticsDataQualityIssue(load_run_id=load_run.id, **issue) for issue in bundle.issues]
            )
            load_run.status = "completed"
            load_run.finished_at = _utcnow()
            load_run.row_counts = bundle.row_counts()
            load_run.issue_count = len(bundle.issues)
            await session.commit()
            return load_run
        except Exception:
            await session.rollback()
            raise


async def _upsert(session: AsyncSession, model: type, records: list[dict[str, Any]], batch_size: int = 1000) -> None:
    if not records:
        return
    primary_keys = [column.name for column in model.__table__.primary_key.columns]
    for offset in range(0, len(records), batch_size):
        statement = pg_insert(model).values(records[offset : offset + batch_size])
        update_columns = {
            column.name: getattr(statement.excluded, column.name)
            for column in model.__table__.columns
            if column.name not in primary_keys
        }
        await session.execute(statement.on_conflict_do_update(index_elements=primary_keys, set_=update_columns))


def _record_orphans(bundle: SnapshotBundle) -> None:
    company_ids = {row["source_id"] for row in bundle.companies}
    channel_ids = {row["source_id"] for row in bundle.channels}
    user_ids = {row["source_id"] for row in bundle.users}
    video_ids = {row["source_id"] for row in bundle.videos}

    for video in bundle.videos:
        _record_missing(bundle, "videos", video["source_id"], "company_id", video["company_source_id"], company_ids)
        _record_missing(bundle, "videos", video["source_id"], "channel_id", video["channel_source_id"], channel_ids)
        _record_missing(bundle, "videos", video["source_id"], "user_id", video["user_source_id"], user_ids)
        _record_missing(bundle, "videos", video["source_id"], "parent_video_id", video["parent_source_video_id"], video_ids)
    for service in bundle.services:
        _record_missing(bundle, "services_requested", service["source_id"], "video_id", service["video_source_id"], video_ids)


def _record_missing(bundle: SnapshotBundle, table: str, source_key: Any, column: str, value: Any, valid: set[Any]) -> None:
    if value is not None and value not in valid:
        bundle.issues.append(_issue(table, source_key, "orphan_reference", {"column": column, "value": value}))


def _issue(table: str, key: Any, code: str, details: dict[str, Any]) -> dict[str, Any]:
    return {"source_table": table, "source_key": str(key), "issue_code": code, "severity": "warning", "details": details}


def _status_label(labels: dict[int, str], value: int) -> str:
    return labels.get(value, f"unknown({value})")


def _normalize_text(value: str | None) -> str | None:
    return value.strip() if value and value.strip() else None


def _datetime(value: str | None) -> datetime | None:
    if not value or value == "0000-00-00 00:00:00":
        return None
    return datetime.fromisoformat(value)


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _id_or_none(value: str | None) -> int | None:
    parsed = _int_or_none(value)
    return None if parsed in {None, 0} else parsed


def _int_or_none(value: str | None) -> int | None:
    return None if value in {None, ""} else int(value)


def _int(value: str | None, default: int = 0) -> int:
    return default if value in {None, ""} else int(value)


def _bool(value: str | None, default: bool = False) -> bool:
    if value in {None, ""}:
        return default
    return value == "1"


def main() -> None:
    parser = argparse.ArgumentParser(description="Load a Frammer SQL snapshot into analytics marts.")
    parser.add_argument("--file", type=Path, required=True, help="Path to the MySQL SQL dump")
    args = parser.parse_args()
    load_run = asyncio.run(import_snapshot(args.file.resolve()))
    print(f"load_run={load_run.id} status={load_run.status} checksum={load_run.source_checksum}")


if __name__ == "__main__":
    main()
