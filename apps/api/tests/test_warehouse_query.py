from apps.api.app.schemas.analytics import AnalyticsFilterState, WarehouseMetricRequest
from apps.api.app.services.warehouse_query import aggregate_rows, filter_rows


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
