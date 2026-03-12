from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.auth_utils import decode_token, hash_password
from app.database import get_db
from app.routes.auth import UserPublic, _doc_to_public

router = APIRouter(prefix="/users", tags=["app-users"])


def _get_current_user(authorization: str | None = Header(default=None, alias="Authorization")):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from bson import ObjectId
    db = get_db()
    doc = db["users"].find_one({"_id": ObjectId(payload["sub"])})
    if not doc:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return doc


def _require_admin(doc: dict) -> dict:
    if doc.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return doc


class CreateUserBody(BaseModel):
    username: str
    password: str
    role: str = "regular"


class UpdateUserBody(BaseModel):
    role: str | None = None


@router.get("", response_model=list[UserPublic])
def list_users(
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    _require_admin(_get_current_user(authorization))
    db = get_db()
    return [_doc_to_public(doc) for doc in db["users"].find({})]


@router.post("", response_model=UserPublic)
def create_user(
    body: CreateUserBody,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    _require_admin(_get_current_user(authorization))
    db = get_db()
    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=422, detail="Username required")
    if db["users"].find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    doc = {
        "username": username,
        "hashed_password": hash_password(body.password),
        "role": body.role if body.role in ("admin", "regular", "guest") else "regular",
        "is_guest": False,
    }
    result = db["users"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_public(doc)


@router.patch("/{user_id}", response_model=UserPublic)
def update_user(
    user_id: str,
    body: UpdateUserBody,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    _require_admin(_get_current_user(authorization))
    from bson import ObjectId
    db = get_db()
    updates = {}
    if body.role is not None:
        updates["role"] = body.role
    if not updates:
        doc = db["users"].find_one({"_id": ObjectId(user_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="User not found")
        return _doc_to_public(doc)
    result = db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    doc = db["users"].find_one({"_id": ObjectId(user_id)})
    return _doc_to_public(doc)