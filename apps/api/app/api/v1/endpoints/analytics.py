from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.db.session import get_db_session
from apps.api.app.repositories.analytics import AnalyticsRepository
from apps.api.app.schemas.analytics import WarehouseQueryRequest, WidgetQueryRequest, WidgetQueryResponse
from apps.api.app.services.semantic_metrics import SemanticAnalyticsService, metric_catalog
from apps.api.app.services.warehouse_query import WarehouseQueryService

router = APIRouter(prefix="/analytics")


def get_repository(session: AsyncSession = Depends(get_db_session)) -> AnalyticsRepository:
    return AnalyticsRepository(session)


def get_semantic_service(repository: AnalyticsRepository = Depends(get_repository)) -> SemanticAnalyticsService:
    return SemanticAnalyticsService(repository)


def get_warehouse_query_service(repository: AnalyticsRepository = Depends(get_repository)) -> WarehouseQueryService:
    return WarehouseQueryService(repository)


@router.post("/widgets/query", response_model=WidgetQueryResponse)
async def query_widget(
    request: WidgetQueryRequest,
    service: SemanticAnalyticsService = Depends(get_semantic_service),
) -> WidgetQueryResponse:
    result = await service.widget_query(request.queryKey, request.config, request.context)
    return WidgetQueryResponse(data=result.data, meta=result.meta)


@router.get("/filters")
async def list_filters(repository: AnalyticsRepository = Depends(get_repository)) -> dict:
    return {"ok": True, "data": await repository.filter_options()}


@router.get("/videos")
async def list_videos(
    limit: int = Query(default=500, ge=1, le=10000),
    service: SemanticAnalyticsService = Depends(get_semantic_service),
) -> dict:
    result = await service.videos(limit)
    return {"ok": True, "data": result.data, "count": len(result.data), "meta": result.meta}


@router.get("/metrics/catalog")
async def list_metrics() -> dict:
    return {"ok": True, "data": metric_catalog()}


@router.get("/warehouse/catalog")
async def warehouse_catalog(service: WarehouseQueryService = Depends(get_warehouse_query_service)) -> dict:
    return {"ok": True, "data": await service.catalog()}


@router.post("/warehouse/query")
async def warehouse_query(
    request: WarehouseQueryRequest,
    service: WarehouseQueryService = Depends(get_warehouse_query_service),
) -> dict:
    try:
        result = await service.query(request)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"ok": True, "data": {"rows": result.rows, "groups": result.groups}, "meta": result.meta}


@router.get("/data-quality")
async def list_data_quality(
    limit: int = Query(default=500, ge=1, le=5000),
    repository: AnalyticsRepository = Depends(get_repository),
) -> dict:
    issues = await repository.list_quality_issues(limit)
    latest = await repository.latest_load_run()
    return {
        "ok": True,
        "data": [
            {
                "id": issue.id,
                "sourceTable": issue.source_table,
                "sourceKey": issue.source_key,
                "issueCode": issue.issue_code,
                "severity": issue.severity,
                "details": issue.details,
            }
            for issue in issues
        ],
        "meta": {
            "source": "sql",
            "availability": "available",
            "asOf": latest.finished_at.isoformat() if latest and latest.finished_at else None,
        },
    }
