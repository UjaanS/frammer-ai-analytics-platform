from fastapi.testclient import TestClient

from apps.api.app.main import create_app


def test_metric_catalog_endpoint_does_not_require_database_connection() -> None:
    client = TestClient(create_app())

    response = client.get("/api/v1/analytics/metrics/catalog")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert any(metric["id"] == "processingSuccessRate" for metric in payload["data"])
    assert any(metric["id"] == "downloads" and metric["available"] is False for metric in payload["data"])
