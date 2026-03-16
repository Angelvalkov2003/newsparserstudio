from datetime import datetime, timezone
from bson import ObjectId

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.database import get_db
from app.routes.auth import _get_current_user_id_and_role, user_can_access
from app.unique_site import get_or_create_unique_site

router = APIRouter(prefix="/sites", tags=["sites"])


def _get_current_user_id(authorization: str | None = Header(default=None, alias="Authorization")) -> str:
    uid, _ = _get_current_user_id_and_role(authorization)
    return uid


class SiteCreate(BaseModel):
    name: str
    url: str
    allowed_for: list[str] | None = None


class SiteUpdate(BaseModel):
    name: str
    url: str
    allowed_for: list[str] | None = None


class SiteVisibilityUpdate(BaseModel):
    allowed_for: list[str]


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


def _doc_to_site(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "url": doc["url"],
        "created_by": doc.get("created_by"),
        "allowed_for": doc.get("allowed_for") or [],
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", ""),
    }


def _enrich_sites_with_usernames(db, items: list, role: str) -> list:
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
def list_sites(
    authorization: str | None = Header(default=None, alias="Authorization"),
    sort: str | None = Query(default=None, description="Admin: sort=created_by or sort=created_at"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    if role == "admin":
        query = {}
        sort_key = [("created_at", -1)]
        if sort == "created_by":
            sort_key = [("created_by", 1), ("created_at", -1)]
        elif sort == "created_at":
            sort_key = [("created_at", -1)]
        cursor = db["sites"].find(query).sort(sort_key)
    else:
        get_or_create_unique_site(db, user_id)
        cursor = db["sites"].find({"$or": [{"allowed_for": user_id}, {"name": "Unique"}]})
    items = [_doc_to_site(d) for d in cursor]
    return _enrich_sites_with_usernames(db, items, role)


@router.get("/{site_id}")
def get_site(
    site_id: str,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["sites"].find_one({"_id": ObjectId(site_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc.get("name") != "Unique" and not user_can_access(doc, user_id, role):
        raise HTTPException(status_code=404, detail="Not found")
    out = _doc_to_site(doc)
    return _enrich_sites_with_usernames(db, [out], role)[0]


@router.post("", status_code=201)
def create_site(
    body: SiteCreate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    allowed_for = body.allowed_for if body.allowed_for is not None else [user_id]
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "name": body.name.strip(),
        "url": body.url.strip(),
        "created_by": user_id,
        "allowed_for": allowed_for,
        "created_at": now,
        "updated_at": now,
    }
    db = get_db()
    result = db["sites"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_site(doc)


@router.put("/{site_id}")
def update_site(
    site_id: str,
    body: SiteUpdate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["sites"].find_one({"_id": ObjectId(site_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if not user_can_access(doc, user_id, role):
        raise HTTPException(status_code=403, detail="Forbidden")
    now = datetime.now(timezone.utc).isoformat()
    set_payload = {"name": body.name.strip(), "url": body.url.strip(), "updated_at": now}
    previous_allowed_for = doc.get("allowed_for") or []
    if body.allowed_for is not None:
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admin can set visibility (allowed_for)")
        set_payload["allowed_for"] = body.allowed_for
    db["sites"].update_one({"_id": ObjectId(site_id)}, {"$set": set_payload})
    doc.update(set_payload)
    # When site visibility changes, ensure all its pages include at least these users in their allowed_for.
    # This gives pages under the site access "by default" for users who can see the site.
    if "allowed_for" in set_payload:
        new_allowed_for = set_payload["allowed_for"] or []
        # Only apply if there is an actual change to avoid unnecessary writes
        if set(previous_allowed_for) != set(new_allowed_for):
            db["pages"].update_many(
                {"site_id": site_id},
                {"$addToSet": {"allowed_for": {"$each": new_allowed_for}}},
            )
    return _doc_to_site(doc)


@router.patch("/{site_id}/visibility")
def set_site_visibility(
    site_id: str,
    body: SiteVisibilityUpdate,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    _, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    try:
        doc = db["sites"].find_one({"_id": ObjectId(site_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    now = datetime.now(timezone.utc).isoformat()
    db["sites"].update_one(
        {"_id": ObjectId(site_id)},
        {"$set": {"allowed_for": body.allowed_for, "updated_at": now}},
    )
    # When site visibility changes, ensure all its pages include at least these users in their allowed_for,
    # so that site access automatically grants page access by default.
    new_allowed_for = body.allowed_for or []
    if new_allowed_for:
        db["pages"].update_many(
            {"site_id": site_id},
            {"$addToSet": {"allowed_for": {"$each": new_allowed_for}}},
        )
    doc["allowed_for"] = body.allowed_for
    doc["updated_at"] = now
    return _doc_to_site(doc)


@router.delete("/{site_id}", status_code=204)
def delete_site(
    site_id: str,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    db = get_db()
    try:
        doc = db["sites"].find_one({"_id": ObjectId(site_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if not user_can_access(doc, user_id, role):
        raise HTTPException(status_code=403, detail="Forbidden")
    db["sites"].delete_one({"_id": ObjectId(site_id)})
