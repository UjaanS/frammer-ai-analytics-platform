import asyncio
from types import SimpleNamespace

from apps.api.app.core.config import settings
from apps.api.app.repositories.analytics import AnalyticsRepository, _warehouse_conditions, _warehouse_spec
from apps.api.app.schemas.analytics import AnalyticsFilterState, WarehouseMetricRequest, WarehouseQueryRequest
from apps.api.app.services.warehouse_query import WarehouseQueryService, _processing_turnaround_bucket, _service_row, aggregate_rows, filter_rows


def test_unrestricted_filters_include_complete_dataset() -> None:
    rows = [
        {"id": 1, "company": "A", "status": "done", "deleted": False, "date": "2024-01-01", "searchText": "alpha"},
        {"id": 2, "company": "B", "status": "deleted", "deleted": True, "date": "2024-01-02", "searchText": "beta"},
    ]

    assert filter_rows(rows, AnalyticsFilterState(), None) == rows


def test_filters_search_and_dynamic_aggregation_apply_to_active_rows_only() -> None:
    rows = [
        {"id": 1, "company": "A", "status": "done", "deleted": False, "date": "2024-01-01", "durationSeconds": 10, "searchText": "alpha"},
        {"id": 2, "company": "A", "status": "error", "deleted": False, "date": "2024-01-02", "durationSeconds": 20, "searchText": "beta"},
        {"id": 3, "company": "B", "status": "done", "deleted": True, "date": "2024-01-03", "durationSeconds": 30, "searchText": "alpha"},
    ]
    filtered = filter_rows(
        rows,
        AnalyticsFilterState(company="A", includeDeleted=False),
        "alpha",
    )
    groups = aggregate_rows(
        filtered,
        ["company"],
        [
            WarehouseMetricRequest(id="recordCount"),
            WarehouseMetricRequest(id="durationSeconds", aggregation="sum"),
            WarehouseMetricRequest(id="completionRate", aggregation="rate"),
        ],
        "videos",
    )

    assert groups == [{"company": "A", "recordCount": 1, "durationSeconds": 10.0, "completionRate": 100.0}]


def test_dimension_filters_scope_drilldown_rows() -> None:
    rows = [
        {"id": 1, "sourceTable": "videos", "issueCode": "orphan", "searchText": "videos orphan"},
        {"id": 2, "sourceTable": "services", "issueCode": "orphan", "searchText": "services orphan"},
    ]

    assert filter_rows(rows, AnalyticsFilterState(), None, {"sourceTable": "videos"}) == [rows[0]]


def test_widget_dimension_filters_intersect_with_active_dashboard_filters() -> None:
    rows = [{"id": 1, "company": "A", "searchText": "alpha"}]

    assert filter_rows(rows, AnalyticsFilterState(company="A"), None, {"company": "B"}) == []


def test_grouped_output_yield_and_turnaround_buckets_are_available() -> None:
    rows = [
        {"channel": "A", "videoType": "original"},
        {"channel": "A", "videoType": "viral"},
        {"channel": "A", "videoType": "summary"},
    ]

    assert aggregate_rows(rows, ["channel"], [WarehouseMetricRequest(id="outputYield", aggregation="rate")], "videos") == [
        {"channel": "A", "outputYield": 2.0}
    ]
    assert [_processing_turnaround_bucket(value) for value in [None, 30, 300, 900, 3600, 3601]] == [
        "Unknown",
        "<1m",
        "1-5m",
        "5-15m",
        "15-60m",
        ">60m",
    ]


def test_global_filters_ignore_dimensions_not_exposed_by_dataset() -> None:
    rows = [{"id": 1, "sourceTable": "videos", "issueCode": "orphan", "searchText": "videos orphan"}]

    assert filter_rows(rows, AnalyticsFilterState(company="Sky News"), None, applicable_dimensions={"sourceTable"}) == rows


def test_sql_warehouse_filters_ignore_non_applicable_dimensions_and_compare_case_insensitively() -> None:
    quality_request = WarehouseQueryRequest(dataset="qualityIssues", filters=AnalyticsFilterState(company="Sky News"))
    video_request = WarehouseQueryRequest(dataset="videos", filters=AnalyticsFilterState(company="sky news"))

    assert _warehouse_conditions(_warehouse_spec("qualityIssues"), quality_request) == []
    sql = str(_warehouse_conditions(_warehouse_spec("videos"), video_request)[0].compile(compile_kwargs={"literal_binds": True}))
    assert "lower(" in sql
    assert "'sky news'" in sql


def test_quality_summary_counts_latest_completed_load_only() -> None:
    class Session:
        async def scalar(self, statement):
            return 12

    class Repository(AnalyticsRepository):
        async def latest_completed_load_run(self):
            return SimpleNamespace(id=7)

    result = asyncio.run(Repository(Session()).get_quality_summary_metrics())

    assert result == {"recordedQualityIssues": 12}


def test_operational_summary_filters_use_dataset_specific_dates() -> None:
    repository = AnalyticsRepository(SimpleNamespace())
    context = {"dateRange": {"start": "2026-01-01", "end": "2026-01-31"}, "filters": {}}

    service_sql = " ".join(str(condition.compile(compile_kwargs={"literal_binds": True})) for condition in repository._related_service_filters(context))
    schedule_sql = " ".join(str(condition.compile(compile_kwargs={"literal_binds": True})) for condition in repository._related_schedule_filters(context))

    assert "fact_service_request.end_time" in service_sql
    assert "fact_publish_schedule.scheduled_time" in schedule_sql
    assert "fact_video.date_added" not in service_sql
    assert "fact_video.date_added" not in schedule_sql


def test_service_rows_include_joined_dimensions_in_search() -> None:
    service = SimpleNamespace(
        source_id=1,
        video_source_id=2,
        service_type="summary",
        initiated_by="system",
        status_label="done",
        duration_seconds=10,
        published_raw=0,
        date_added=None,
    )
    row = _service_row(
        service,
        {
            "company": "Sky News",
            "channel": "Test Sky News",
            "user": "Test user",
            "language": "en",
            "videoType": "original",
            "sourcePlatform": "youtube",
        },
    )

    assert row["company"] == "Sky News"
    assert "Sky News" in row["searchText"]


def test_warehouse_query_can_switch_between_sql_and_legacy_grouping(monkeypatch) -> None:
    class Repository:
        async def list_videos(self):
            return []

        async def aggregate_warehouse_query(self, request):
            return [{"recordCount": 7}]

        async def latest_load_run(self):
            return None

    request = WarehouseQueryRequest(dataset="videos")
    service = WarehouseQueryService(Repository())

    monkeypatch.setattr(settings, "use_sql_aggregation", True)
    sql_result = asyncio.run(service.query(request))
    monkeypatch.setattr(settings, "use_sql_aggregation", False)
    legacy_result = asyncio.run(service.query(request))

    assert sql_result.groups == [{"recordCount": 7}]
    assert legacy_result.groups == [{"recordCount": 0}]


def test_sql_warehouse_query_uses_sql_rows_and_groups_without_python_dataset_load(monkeypatch) -> None:
    class Repository:
        async def list_warehouse_query_rows(self, request):
            return [{"id": 1, "sourcePlatform": "mp4"}]

        async def count_warehouse_query_rows(self, request, *, filtered):
            return 1 if filtered else 10

        async def aggregate_warehouse_query(self, request):
            return [{"sourcePlatform": "mp4", "recordCount": 1}]

        async def latest_load_run(self):
            return None

        async def list_videos(self):
            raise AssertionError("SQL warehouse path should not load Python dataset rows")

    request = WarehouseQueryRequest(dataset="videos", groupBy=["sourcePlatform"])
    service = WarehouseQueryService(Repository())

    monkeypatch.setattr(settings, "use_sql_aggregation", True)
    result = asyncio.run(service.query(request))

    assert result.rows == [{"id": 1, "sourcePlatform": "mp4"}]
    assert result.groups == [{"sourcePlatform": "mp4", "recordCount": 1}]
    assert result.meta["aggregation"] == "sql"
    assert result.meta["totalRows"] == 10
    assert result.meta["filteredRows"] == 1
