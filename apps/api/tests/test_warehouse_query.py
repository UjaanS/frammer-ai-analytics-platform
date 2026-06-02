import asyncio
from types import SimpleNamespace

from apps.api.app.core.config import settings
from apps.api.app.schemas.analytics import AnalyticsFilterState, WarehouseMetricRequest, WarehouseQueryRequest
from apps.api.app.services.warehouse_query import WarehouseQueryService, _service_row, aggregate_rows, filter_rows


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
