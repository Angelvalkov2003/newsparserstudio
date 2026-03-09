"""
Auth: password hashing, JWT, current user dependency.
"""
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from mongodb import get_users_collection

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str, username: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "username": username, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


def user_doc_to_public(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "role": user["role"],
        "is_verified_by_admin": user.get("is_verified_by_admin", False),
        "is_guest": user.get("is_guest", False),
    }


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)]
) -> dict | None:
    if not credentials or not credentials.credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    users = get_users_collection()
    doc = users.find_one({"_id": ObjectId(payload["sub"])})
    if not doc:
        return None
    return {
        "_id": doc["_id"],
        "id": str(doc["_id"]),
        "username": doc["username"],
        "role": doc["role"],
        "is_verified_by_admin": doc.get("is_verified_by_admin", False),
        "is_guest": doc.get("is_guest", False),
    }


async def get_current_user(
    user: Annotated[dict | None, Depends(get_current_user_optional)]
) -> dict:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


def require_admin(user: dict) -> None:
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")


def can_see_item(user: dict, created_by: str | None, allowed_for: list | None) -> bool:
    if user.get("role") == "admin":
        return True
    uid = user.get("id")
    if not uid:
        return False
    if created_by and created_by == uid:
        return True
    if allowed_for and uid in allowed_for:
        return True
    return False
