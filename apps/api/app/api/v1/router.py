from fastapi import APIRouter

from apps.api.app.api.v1.endpoints import analytics, health

router = APIRouter()
router.include_router(health.router, tags=["system"])
router.include_router(analytics.router, tags=["analytics"])
