from datetime import datetime, timezone
from bson import ObjectId

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.database import get_db
from app.routes.auth import _get_current_user_id_and_role

router = APIRouter(prefix="/parsed", tags=["parsed"])


class ParsedCreate(BaseModel):
    page_id: str
    name: str | None = None
    data: str
    info: str | None = None
    is_verified: bool = False


class ParsedUpdate(BaseModel):
    page_id: str
    name: str | None = None
    data: str
    info: str | None = None
    is_verified: bool = False
    allowed_for: list[str] | None = None


class ParsedVisibilityUpdate(BaseModel):
    allowed_for: list[str]


def _doc_to_parsed(doc: dict, page_title: str | None = None, page_url: str | None = None) -> dict:
    out = {
        "id": str(doc["_id"]),
        "page_id": doc["page_id"],
        "name": doc.get("name"),
        "data": doc.get("data", ""),
        "info": doc.get("info"),
        "is_verified": doc.get("is_verified", False),
        "created_by": doc.get("created_by"),
        "allowed_for": doc.get("allowed_for") or [],
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", ""),
    }
    if page_title is not None:
        out["page_title"] = page_title
    if page_url is not None:
        out["page_url"] = page_url
    return out


def _get_page_info(db, page_id: str) -> tuple[str | None, str | None]:
    try:
        p = db["pages"].find_one({"_id": ObjectId(page_id)})
        if not p:
            return None, None
        return p.get("title"), p.get("url")
    except Exception:
        return None, None


def _user_ids_to_usernames(db, user_ids: list) -> dict:
    if not user_ids:
        return {}
    ids = []
    for u in user_ids:
        if not u:
            continue
        try:
            ids.append(ObjectId(u))
        except Exception:
            pass
    if not ids:
        return {}
    users = list(db["users"].find({"_id": {"$in": ids}}, {"username": 1}))
    return {str(u["_id"]): u.get("username", "?") for u in users}


def _enrich_parsed_with_usernames(db, items: list, role: str) -> list:
    if role != "admin" or not items:
        return items
    all_ids = set()
    for it in items:
        if it.get("created_by"):
            all_ids.add(it["created_by"])
        for a in it.get("allowed_for") or []:
            all_ids.add(a)
    id_to_name = _user_ids_to_usernames(db, list(all_ids))
    for it in items:
        it["created_by_username"] = id_to_name.get(it.get("created_by") or "", "") or None
        it["allowed_for_usernames"] = [id_to_name.get(a, "") or a for a in (it.get("allowed_for") or [])]
    return items


@router.get("")
def list_parsed(
    authorization: str | None = Header(default=None, alias="Authorization"),
    page_id: str | None = Query(default=None),
    sort: str | None = Query(default=None, description="Admin: sort=created_by or sort=created_at"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    if role == "admin":
        query = {} if not page_id else {"page_id": page_id}
        sort_key = [("created_at", -1)]
        if sort == "created_by":
            sort_key = [("created_by", 1), ("created_at", -1)]
        elif sort == "created_at":
            sort_key = [("created_at", -1)]
        cursor = db["parsed"].find(query).sort(sort_key)
    else:
        q = {"allowed_for": user_id}
        if page_id:
            q["page_id"] = page_id
        cursor = db["parsed"].find(q)
    result = []
    for d in cursor:
        title, url = _get_page_info(db, d["page_id"])
        result.append(_doc_to_parsed(d, title, url))
    return _enrich_parsed_with_usernames(db, result, role)


@router.get("/{parsed_id}")
def get_parsed(
    parsed_id: str,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["parsed"].find_one({"_id": ObjectId(parsed_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if role != "admin" and user_id not in (doc.get("allowed_for") or []):
        raise HTTPException(status_code=404, detail="Not found")
    title, url = _get_page_info(db, doc["page_id"])
    out = _doc_to_parsed(doc, title, url)
    return _enrich_parsed_with_usernames(db, [out], role)[0]


def _get_current_user_id(authorization):
    uid, _ = _get_current_user_id_and_role(authorization)
    return uid


@router.post("", status_code=201)
def create_parsed(
    body: ParsedCreate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id = _get_current_user_id(authorization)
    db = get_db()
    _, role = _get_current_user_id_and_role(authorization)
    page = db["pages"].find_one({"_id": ObjectId(body.page_id)})
    if not page:
        raise HTTPException(status_code=400, detail="Page not found")
    if role != "admin" and user_id not in (page.get("allowed_for") or []):
        raise HTTPException(status_code=403, detail="No access to this page")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "page_id": body.page_id,
        "name": body.name.strip() if body.name else None,
        "data": body.data,
        "info": body.info.strip() if body.info else None,
        "is_verified": body.is_verified,
        "created_by": user_id,
        "allowed_for": [user_id],
        "created_at": now,
        "updated_at": now,
    }
    result = db["parsed"].insert_one(doc)
    doc["_id"] = result.inserted_id
    title, url = _get_page_info(db, body.page_id)
    return _doc_to_parsed(doc, title, url)


@router.put("/{parsed_id}")
def update_parsed(
    parsed_id: str,
    body: ParsedUpdate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["parsed"].find_one({"_id": ObjectId(parsed_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if role != "admin" and user_id not in (doc.get("allowed_for") or []):
        raise HTTPException(status_code=403, detail="Forbidden")
    now = datetime.now(timezone.utc).isoformat()
    set_payload = {
        "page_id": body.page_id,
        "name": body.name.strip() if body.name else None,
        "data": body.data,
        "info": body.info.strip() if body.info else None,
        "is_verified": body.is_verified,
        "updated_at": now,
    }
    if body.allowed_for is not None:
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admin can set visibility (allowed_for)")
        set_payload["allowed_for"] = body.allowed_for
    db["parsed"].update_one({"_id": ObjectId(parsed_id)}, {"$set": set_payload})
    doc.update(set_payload)
    title, url = _get_page_info(db, doc["page_id"])
    return _doc_to_parsed(doc, title, url)


@router.patch("/{parsed_id}/visibility")
def set_parsed_visibility(
    parsed_id: str,
    body: ParsedVisibilityUpdate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    _, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    try:
        doc = db["parsed"].find_one({"_id": ObjectId(parsed_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    now = datetime.now(timezone.utc).isoformat()
    db["parsed"].update_one({"_id": ObjectId(parsed_id)}, {"$set": {"allowed_for": body.allowed_for, "updated_at": now}})
    doc["allowed_for"] = body.allowed_for
    doc["updated_at"] = now
    title, url = _get_page_info(db, doc["page_id"])
    return _doc_to_parsed(doc, title, url)


@router.delete("/{parsed_id}", status_code=204)
def delete_parsed(
    parsed_id: str,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["parsed"].find_one({"_id": ObjectId(parsed_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if role != "admin" and user_id not in (doc.get("allowed_for") or []):
        raise HTTPException(status_code=403, detail="Forbidden")
    db["parsed"].delete_one({"_id": ObjectId(parsed_id)})
