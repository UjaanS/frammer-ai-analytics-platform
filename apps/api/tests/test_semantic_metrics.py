import asyncio

from apps.api.app.core.config import settings
from apps.api.app.services.semantic_metrics import SemanticAnalyticsService
from types import SimpleNamespace
from datetime import UTC, datetime, timedelta

from apps.api.app.services.semantic_metrics import (
    build_summary,
    extend_operational_summary,
    metric_catalog,
    pending_validation_for_config,
    unavailable_for_config,
)


def record(output: str, processing: str, published: str, duration: float = 1, metadata: list[bool] | None = None, billable: bool = True) -> dict:
    return {
        "outputType": output,
        "processingStatus": processing,
        "publishedStatus": published,
        "durationMinutes": duration,
        "processingMinutes": duration,
        "metadataPresence": metadata or [False] * 6,
        "billableStatus": "Billable" if billable else "Non-billable",
    }


def test_video_metrics_use_original_grain_and_exclude_unknown_from_rate() -> None:
    rows = [
        record("Original", "done", "Published"),
        record("Original", "error", "Failed"),
        record("Original", "unknown(10)", "Draft"),
        record("Viral", "done", "Published"),
    ]

    summary = build_summary(rows)

    assert summary["videosIngested"] == 3
    assert summary["generatedOutputs"] == 1
    assert summary["processingSuccessRate"] == 50
    assert summary["processingErrorRate"] == 50
    assert summary["outputYield"] == 0.33


def test_processing_turnaround_uses_completed_originals_only() -> None:
    rows = [
        record("Original", "done", "Published", duration=10),
        record("Original", "error", "Failed", duration=100),
    ]

    summary = build_summary(rows)

    assert summary["processingTurnaround"] == 10
    assert summary["avgProcessing"] == 10


def test_operational_summary_exposes_truthful_service_and_publish_metrics() -> None:
    old = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=25)
    services = [
        service("done", old, duration_seconds=120, video_source_id=1, service_type="reels"),
        service("done", old, duration_seconds=60, video_source_id=1, service_type="reels"),
        service("done", old, duration_seconds=60, video_source_id=2, service_type="shorts"),
        service("error", old, duration_seconds=30, video_source_id=3, video_replaced_count=2),
        service("queued", old),
    ]
    schedules = [
        SimpleNamespace(status_label="completed"),
        SimpleNamespace(status_label="scheduled"),
    ]

    summary = extend_operational_summary({}, services, schedules, [], [])

    assert summary["averageServiceLatency"] == 1.33
    assert summary["serviceErrorRate"] == 25
    assert summary["serviceErrorVolume"] == 1
    assert summary["stuckServiceJobs24h"] == 1
    assert summary["publishThroughput"] == 1
    assert summary["reels"] == 1
    assert summary["shortsVideos"] == 1
    assert summary["replacedVideos"] == 1


def test_unavailable_metrics_remain_registered() -> None:
    by_id = {metric["id"]: metric for metric in metric_catalog()}

    assert by_id["downloads"]["available"] is False
    assert by_id["processingSuccessRate"]["available"] is True
    assert unavailable_for_config({"metric": "downloads"}) == {
        "downloads": "The SQL snapshot does not contain trustworthy download totals."
    }


def test_legacy_admin_metrics_are_source_backed_or_pending_validation() -> None:
    rows = [
        record("Original", "done", "Published"),
        record("Chapters", "done", "Draft"),
        record("Mykeymoments", "done", "Draft"),
        record("Viral", "done", "Draft", billable=False),
    ]

    summary = build_summary(rows)
    by_id = {metric["id"]: metric for metric in metric_catalog()}

    assert summary["chapters"] == 1
    assert summary["mkmVideos"] == 1
    assert summary["viralVideos"] == 1
    assert summary["nonBillableVideos"] == 1
    assert by_id["reels"]["status"] == "available"
    assert by_id["shortsVideos"]["status"] == "available"
    assert by_id["replacedVideos"]["status"] == "available"
    assert by_id["videosDownloaded"]["status"] == "pending_validation"
    assert "mp4_download" in pending_validation_for_config({"metricId": "videosDownloaded"})["videosDownloaded"]


def service(
    status_label: str,
    date_added: datetime,
    *,
    duration_seconds: int | None = None,
    video_source_id: int | None = None,
    service_type: str = "transcript",
    video_replaced_count: int = 0,
) -> SimpleNamespace:
    return SimpleNamespace(
        status_label=status_label,
        duration_seconds=duration_seconds,
        date_updated=None,
        start_time=None,
        date_added=date_added,
        video_source_id=video_source_id,
        service_type=service_type,
        video_replaced_count=video_replaced_count,
    )


def test_summary_uses_sql_aggregation_without_loading_fact_collections(monkeypatch) -> None:
    expected = {"videosIngested": 3, "generatedOutputs": 1}

    class Repository:
        async def get_summary_metrics(self, context):
            return expected

        async def latest_load_run(self):
            return None

        async def list_videos(self):
            raise AssertionError("SQL summary path should not load video rows")

    monkeypatch.setattr(settings, "use_sql_aggregation", True)

    result = asyncio.run(SemanticAnalyticsService(Repository()).widget_query("summary", {}, None))

    assert result.data == expected


def test_legacy_chart_queries_use_sql_aggregation_without_loading_video_rows(monkeypatch) -> None:
    class Repository:
        async def get_time_trend(self, context, grain):
            return [{"label": "Jan 1", "uploaded": 1}]

        async def get_channel_performance(self, context):
            return [{"channel": "A", "published": 1}]

        async def get_platform_distribution(self, context):
            return [{"channel": "A", "mp4-count": 1}]

        async def latest_load_run(self):
            return None

        async def list_videos(self):
            raise AssertionError("SQL chart path should not load video rows")

    monkeypatch.setattr(settings, "use_sql_aggregation", True)
    service = SemanticAnalyticsService(Repository())

    trend = asyncio.run(service.widget_query("timeTrend", {"timeGroup": "day"}, None))
    channel = asyncio.run(service.widget_query("channelPerformance", {}, None))
    platform = asyncio.run(service.widget_query("platformDistribution", {}, None))

    assert trend.meta["aggregation"] == "sql"
    assert channel.meta["aggregation"] == "sql"
    assert platform.meta["aggregation"] == "sql"
    assert platform.data == [{"channel": "A", "mp4-count": 1}]


def test_summary_can_roll_back_to_legacy_in_memory_path(monkeypatch) -> None:
    class Repository:
        async def get_summary_metrics(self, context):
            raise AssertionError("Legacy summary path should not call SQL aggregates")

        async def latest_load_run(self):
            return None

        async def list_videos(self):
            return []

        async def list_services(self):
            return []

        async def list_publish_schedules(self):
            return []

        async def list_clipcut_requests(self):
            return []

    monkeypatch.setattr(settings, "use_sql_aggregation", False)

    result = asyncio.run(SemanticAnalyticsService(Repository()).widget_query("summary", {}, None))

    assert result.data["videosIngested"] == 0
    assert result.data["serviceBacklog"] == 0
