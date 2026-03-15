from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.auth_utils import (
    create_access_token,
    decode_token,
    generate_guest_username,
    verify_password,
)
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class GuestResumeRequest(BaseModel):
    guest_id: str


class UserPublic(BaseModel):
    id: str
    username: str
    role: str
    is_guest: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


def _doc_to_public(doc: dict) -> UserPublic:
    return UserPublic(
        id=str(doc["_id"]),
        username=doc["username"],
        role=doc.get("role", "regular"),
        is_guest=doc.get("is_guest", False),
    )


def _get_current_user_id_and_role(
    authorization: str | None,
) -> tuple[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload["sub"], payload.get("role", "regular")


def user_can_access(doc: dict, user_id: str, role: str) -> bool:
    """True if user (or admin) can access the document (doc has allowed_for list)."""
    if role == "admin":
        return True
    return user_id in (doc.get("allowed_for") or [])


def user_can_access_page(page_doc: dict, user_id: str, role: str, db) -> bool:
    """True if user can access the page: directly (allowed_for) or via the page's site (site allowed_for)."""
    if user_can_access(page_doc, user_id, role):
        return True
    site_id = page_doc.get("site_id")
    if not site_id:
        return False
    try:
        site = db["sites"].find_one({"_id": ObjectId(site_id)})
    except Exception:
        return False
    if not site:
        return False
    return user_can_access(site, user_id, role)


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    db = get_db()
    doc = db["users"].find_one({"username": body.username.strip(), "is_guest": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not verify_password(body.password, doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    user = _doc_to_public(doc)
    token = create_access_token(str(doc["_id"]), role=doc.get("role", "regular"))
    return LoginResponse(access_token=token, user=user)


@router.post("/guest", response_model=LoginResponse)
def guest():
    db = get_db()
    username = generate_guest_username()
    doc = {
        "username": username,
        "hashed_password": "",
        "role": "guest",
        "is_guest": True,
    }
    result = db["users"].insert_one(doc)
    doc["_id"] = result.inserted_id
    user = _doc_to_public(doc)
    token = create_access_token(str(result.inserted_id), role="guest")
    return LoginResponse(access_token=token, user=user)


@router.post("/guest-resume", response_model=LoginResponse)
def guest_resume(body: GuestResumeRequest):
    db = get_db()
    try:
        oid = ObjectId(body.guest_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid guest_id")
    doc = db["users"].find_one({"_id": oid, "is_guest": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Guest not found")
    user = _doc_to_public(doc)
    token = create_access_token(str(doc["_id"]), role="guest")
    return LoginResponse(access_token=token, user=user)


@router.get("/me", response_model=UserPublic)
def me(authorization: str | None = Header(default=None, alias="Authorization")):
    user_id, _role = _get_current_user_id_and_role(authorization)
    db = get_db()
    doc = db["users"].find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    return _doc_to_public(doc)
