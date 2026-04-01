from fastapi import APIRouter, Header, HTTPException, Query

from app.routes.auth import _get_current_user_id_and_role
from app.sql_sync import CHECKPOINT_NAME, run_sql_sync
from app.database import get_db

router = APIRouter(prefix="/sql-sync", tags=["sql-sync"])


def _require_admin(authorization: str | None) -> None:
    _, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


@router.post("/run")
def run_sync(
    authorization: str | None = Header(default=None, alias="Authorization"),
    batch_size: int | None = Query(default=None, ge=1, le=5000),
):
    _require_admin(authorization)
    try:
        return run_sql_sync(batch_size=batch_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def sync_status(
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    _require_admin(authorization)
    db = get_db()
    checkpoint = db["sync_checkpoints"].find_one({"name": CHECKPOINT_NAME}) or {}
    return {
        "name": CHECKPOINT_NAME,
        "last_id": int(checkpoint.get("last_id", 0)),
        "updated_at": checkpoint.get("updated_at"),
    }
