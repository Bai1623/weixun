from fastapi import APIRouter

from app.api.v1 import activity, cocktails, daily, users

router = APIRouter(prefix="/api/v1")
router.include_router(cocktails.router)
router.include_router(users.router)
router.include_router(daily.router)
router.include_router(activity.router)


@router.get("/status")
def get_status() -> dict[str, str]:
    return {"status": "ready", "stage": "prototype"}
