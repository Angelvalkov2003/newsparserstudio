from datetime import datetime, timezone
from bson import ObjectId

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.database import get_db
from app.routes.auth import _get_current_user_id_and_role

router = APIRouter(prefix="/pages", tags=["pages"])


def _get_current_user_id(authorization):
    uid, _ = _get_current_user_id_and_role(authorization)
    return uid


class PageCreate(BaseModel):
    title: str | None = None
    url: str
    site_id: str


class PageUpdate(BaseModel):
    title: str | None = None
    url: str
    site_id: str
    allowed_for: list[str] | None = None


class PageVisibilityUpdate(BaseModel):
    allowed_for: list[str]


def _doc_to_page(doc: dict, site_name: str | None = None) -> dict:
    out = {
        "id": str(doc["_id"]),
        "title": doc.get("title"),
        "url": doc["url"],
        "site_id": doc["site_id"],
        "created_by": doc.get("created_by"),
        "allowed_for": doc.get("allowed_for") or [],
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", ""),
    }
    if site_name is not None:
        out["site_name"] = site_name
    return out


def _get_site_name(db, site_id: str) -> str | None:
    try:
        s = db["sites"].find_one({"_id": ObjectId(site_id)})
        return s.get("name") if s else None
    except Exception:
        return None


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


def _enrich_pages_with_usernames(db, items: list, role: str) -> list:
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
def list_pages(
    authorization: str | None = Header(default=None, alias="Authorization"),
    site_id: str | None = Query(default=None),
    sort: str | None = Query(default=None, description="Admin: sort=created_by or sort=created_at"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    if role == "admin":
        query = {} if not site_id else {"site_id": site_id}
        sort_key = [("created_at", -1)]
        if sort == "created_by":
            sort_key = [("created_by", 1), ("created_at", -1)]
        elif sort == "created_at":
            sort_key = [("created_at", -1)]
        cursor = db["pages"].find(query).sort(sort_key)
    else:
        q = {"allowed_for": user_id}
        if site_id:
            q["site_id"] = site_id
        cursor = db["pages"].find(q)
    result = []
    for d in cursor:
        result.append(_doc_to_page(d, _get_site_name(db, d["site_id"])))
    return _enrich_pages_with_usernames(db, result, role)


@router.get("/{page_id}")
def get_page(
    page_id: str,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["pages"].find_one({"_id": ObjectId(page_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if role != "admin" and user_id not in (doc.get("allowed_for") or []):
        raise HTTPException(status_code=404, detail="Not found")
    out = _doc_to_page(doc, _get_site_name(db, doc["site_id"]))
    return _enrich_pages_with_usernames(db, [out], role)[0]


@router.post("", status_code=201)
def create_page(
    body: PageCreate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id = _get_current_user_id(authorization)
    db = get_db()
    _, role = _get_current_user_id_and_role(authorization)
    site = db["sites"].find_one({"_id": ObjectId(body.site_id)})
    if not site:
        raise HTTPException(status_code=400, detail="Site not found")
    if role != "admin" and user_id not in (site.get("allowed_for") or []):
        raise HTTPException(status_code=403, detail="No access to this site")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "title": body.title.strip() if body.title else None,
        "url": body.url.strip(),
        "site_id": body.site_id,
        "created_by": user_id,
        "allowed_for": [user_id],
        "created_at": now,
        "updated_at": now,
    }
    result = db["pages"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_page(doc, _get_site_name(db, body.site_id))


@router.put("/{page_id}")
def update_page(
    page_id: str,
    body: PageUpdate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["pages"].find_one({"_id": ObjectId(page_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if role != "admin" and user_id not in (doc.get("allowed_for") or []):
        raise HTTPException(status_code=403, detail="Forbidden")
    now = datetime.now(timezone.utc).isoformat()
    set_payload = {
        "title": body.title.strip() if body.title else None,
        "url": body.url.strip(),
        "site_id": body.site_id,
        "updated_at": now,
    }
    if body.allowed_for is not None:
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admin can set visibility (allowed_for)")
        set_payload["allowed_for"] = body.allowed_for
    db["pages"].update_one({"_id": ObjectId(page_id)}, {"$set": set_payload})
    doc.update(set_payload)
    return _doc_to_page(doc, _get_site_name(db, doc["site_id"]))


@router.patch("/{page_id}/visibility")
def set_page_visibility(
    page_id: str,
    body: PageVisibilityUpdate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    _, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    try:
        doc = db["pages"].find_one({"_id": ObjectId(page_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    now = datetime.now(timezone.utc).isoformat()
    db["pages"].update_one({"_id": ObjectId(page_id)}, {"$set": {"allowed_for": body.allowed_for, "updated_at": now}})
    doc["allowed_for"] = body.allowed_for
    doc["updated_at"] = now
    return _doc_to_page(doc, _get_site_name(db, doc["site_id"]))


@router.delete("/{page_id}", status_code=204)
def delete_page(
    page_id: str,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["pages"].find_one({"_id": ObjectId(page_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if role != "admin" and user_id not in (doc.get("allowed_for") or []):
        raise HTTPException(status_code=403, detail="Forbidden")
    db["pages"].delete_one({"_id": ObjectId(page_id)})
