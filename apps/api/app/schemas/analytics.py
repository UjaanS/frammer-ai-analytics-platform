from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class WidgetQueryRequest(BaseModel):
    queryKey: str = Field(min_length=1)
    config: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] | None = None


class WidgetQueryResponse(BaseModel):
    ok: bool = True
    data: Any
    meta: dict[str, Any] = Field(default_factory=dict)


class AnalyticsFilterState(BaseModel):
    dateStart: str | None = None
    dateEnd: str | None = None
    company: str | None = None
    channel: str | None = None
    user: str | None = None
    language: str | None = None
    videoType: str | None = None
    serviceType: str | None = None
    sourcePlatform: str | None = None
    publishPlatform: str | None = None
    status: str | None = None
    includeDeleted: bool = True


class WarehouseMetricRequest(BaseModel):
    id: str
    aggregation: Literal["count", "sum", "avg", "min", "max", "rate"] = "count"


class WarehouseQueryRequest(BaseModel):
    dataset: Literal[
        "videos",
        "serviceRequests",
        "publishSchedules",
        "clipcutRequests",
        "trendingSnapshots",
        "lineage",
        "qualityIssues",
    ] = "videos"
    filters: AnalyticsFilterState = Field(default_factory=AnalyticsFilterState)
    dimensionFilters: dict[str, str] = Field(default_factory=dict)
    search: str | None = None
    groupBy: list[str] = Field(default_factory=list, max_length=3)
    metrics: list[WarehouseMetricRequest] = Field(
        default_factory=lambda: [WarehouseMetricRequest(id="recordCount")]
    )
    sortBy: str | None = None
    sortDirection: Literal["asc", "desc"] = "desc"
    limit: int = Field(default=500, ge=1, le=10000)
