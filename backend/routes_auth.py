"""
Auth routes: login, guest, me. Optional: register (first user becomes admin).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from auth import (
    hash_password,
    verify_password,
    create_token,
    get_current_user,
    user_doc_to_public,
)
from mongodb import get_users_collection
from schemas_mongo import LoginRequest, LoginResponse, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    users = get_users_collection()
    doc = users.find_one({"username": body.username})
    if not doc or doc.get("is_guest"):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if doc.get("role") == "regular" and not doc.get("is_verified_by_admin"):
        raise HTTPException(
            status_code=403,
            detail="Account not verified by admin yet",
        )
    token = create_token(
        str(doc["_id"]),
        doc["username"],
        doc["role"],
    )
    return LoginResponse(
        access_token=token,
        user=UserPublic(
            id=str(doc["_id"]),
            username=doc["username"],
            role=doc["role"],
            is_verified_by_admin=doc.get("is_verified_by_admin", False),
            is_guest=False,
        ),
    )


@router.post("/guest", response_model=LoginResponse)
def login_as_guest():
    users = get_users_collection()
    # Create a unique guest user per session (username like guest_<short_id>)
    import random
    import string
    guest_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    username = f"guest_{guest_id}"
    doc = {
        "username": username,
        "password_hash": hash_password(""),  # no login with password
        "role": "guest",
        "is_verified_by_admin": False,
        "is_guest": True,
    }
    r = users.insert_one(doc)
    doc["_id"] = r.inserted_id
    token = create_token(str(r.inserted_id), username, "guest")
    return LoginResponse(
        access_token=token,
        user=UserPublic(
            id=str(r.inserted_id),
            username=username,
            role="guest",
            is_verified_by_admin=False,
            is_guest=True,
        ),
    )


@router.get("/me", response_model=UserPublic)
def me(user: dict = Depends(get_current_user)):
    return UserPublic(
        id=user["id"],
        username=user["username"],
        role=user["role"],
        is_verified_by_admin=user.get("is_verified_by_admin", False),
        is_guest=user.get("is_guest", False),
    )


@router.post("/register", response_model=LoginResponse)
def register(body: LoginRequest):
    """Only allowed when there are no users (creates first admin)."""
    users = get_users_collection()
    if users.count_documents({}) > 0:
        raise HTTPException(status_code=403, detail="Registration disabled")
    existing = users.find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    doc = {
        "username": body.username,
        "password_hash": hash_password(body.password),
        "role": "admin",
        "is_verified_by_admin": True,
        "is_guest": False,
    }
    r = users.insert_one(doc)
    doc["_id"] = r.inserted_id
    token = create_token(str(r.inserted_id), doc["username"], doc["role"])
    return LoginResponse(
        access_token=token,
        user=UserPublic(
            id=str(r.inserted_id),
            username=doc["username"],
            role=doc["role"],
            is_verified_by_admin=True,
            is_guest=False,
        ),
    )
