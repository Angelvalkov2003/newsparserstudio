"""
User management (admin only).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from auth import get_current_user, require_admin, hash_password
from mongodb import get_users_collection
from schemas_mongo import UserCreate, UserUpdate, UserPublic

router = APIRouter(prefix="/api/users", tags=["users"])


def _user_out(doc: dict) -> UserPublic:
    return UserPublic(
        id=str(doc["_id"]),
        username=doc["username"],
        role=doc["role"],
        is_verified_by_admin=doc.get("is_verified_by_admin", False),
        is_guest=doc.get("is_guest", False),
    )


@router.get("", response_model=list[UserPublic])
def list_users(
    user: dict = Depends(get_current_user),
):
    require_admin(user)
    users = get_users_collection()
    cursor = users.find({}).sort("username", 1)
    return [_user_out(d) for d in cursor]


@router.post("", response_model=UserPublic)
def create_user(
    body: UserCreate,
    user: dict = Depends(get_current_user),
):
    require_admin(user)
    if body.role not in ("admin", "regular"):
        raise HTTPException(status_code=400, detail="role must be admin or regular")
    coll = get_users_collection()
    if coll.find_one({"username": body.username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    doc = {
        "username": body.username,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "is_verified_by_admin": body.role == "admin",
        "is_guest": False,
    }
    r = coll.insert_one(doc)
    doc["_id"] = r.inserted_id
    return _user_out(doc)


@router.patch("/{user_id}", response_model=UserPublic)
def update_user(
    user_id: str,
    body: UserUpdate,
    user: dict = Depends(get_current_user),
):
    require_admin(user)
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")
    coll = get_users_collection()
    doc = coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    updates = {}
    if body.role is not None:
        if body.role not in ("admin", "regular", "guest"):
            raise HTTPException(status_code=400, detail="Invalid role")
        updates["role"] = body.role
    if body.is_verified_by_admin is not None:
        updates["is_verified_by_admin"] = body.is_verified_by_admin
    if updates:
        coll.update_one({"_id": oid}, {"$set": updates})
        doc = coll.find_one({"_id": oid})
    return _user_out(doc)
