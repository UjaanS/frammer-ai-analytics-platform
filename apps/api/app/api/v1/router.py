from fastapi import APIRouter

from apps.api.app.api.v1.endpoints import health

router = APIRouter()
router.include_router(health.router, tags=["system"])
