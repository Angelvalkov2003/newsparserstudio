"""
Sites, pages, parsed with MongoDB. Visibility: creator, allowed_for, or admin.
"""
import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from auth import get_current_user_optional, get_current_user, require_admin, can_see_item
from mongodb import get_sites_collection, get_pages_collection, get_parsed_collection
from schemas_mongo import (
    SiteCreate,
    SiteUpdate,
    SiteOut,
    SiteAllowedForUpdate,
    PageCreate,
    PageUpdate,
    PageOut,
    PageOutWithSite,
    PageAllowedForUpdate,
    ParsedCreate,
    ParsedUpdate,
    ParsedOut,
    ParsedOutWithPage,
    ParsedAllowedForUpdate,
    ImportBulkBody,
    ImportBulkResult,
)

router = APIRouter(prefix="/api", tags=["api"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _oid(s: str) -> ObjectId | None:
    try:
        return ObjectId(s)
    except Exception:
        return None


# --- Sites ---
def _site_doc_to_out(d: dict) -> SiteOut:
    return SiteOut(
        id=str(d["_id"]),
        name=d["name"],
        url=d["url"],
        created_by=d.get("created_by"),
        allowed_for=d.get("allowed_for") or [],
        created_at=d.get("created_at", _now()),
        updated_at=d.get("updated_at", _now()),
    )


@router.get("/sites", response_model=list[SiteOut])
def list_sites(user: Annotated[dict | None, Depends(get_current_user_optional)] = None):
    if not user:
        return []
    coll = get_sites_collection()
    uid = user["id"]
    if user.get("role") == "admin":
        cursor = coll.find({}).sort("created_at", 1)
    else:
        cursor = coll.find({
            "$or": [
                {"created_by": uid},
                {"allowed_for": uid},
            ]
        }).sort("created_at", 1)
    return [_site_doc_to_out(d) for d in cursor]


@router.get("/sites/{site_id}", response_model=SiteOut)
def get_site(
    site_id: str,
    user: dict = Depends(get_current_user),
):
    oid = _oid(site_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Site not found")
    coll = get_sites_collection()
    doc = coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Site not found")
    return _site_doc_to_out(doc)


@router.post("/sites", response_model=SiteOut)
def create_site(
    body: SiteCreate,
    user: dict = Depends(get_current_user),
):
    coll = get_sites_collection()
    now = _now()
    doc = {
        "name": body.name,
        "url": body.url,
        "created_by": user["id"],
        "allowed_for": [],
        "created_at": now,
        "updated_at": now,
    }
    r = coll.insert_one(doc)
    doc["_id"] = r.inserted_id
    return _site_doc_to_out(doc)


@router.put("/sites/{site_id}", response_model=SiteOut)
def update_site(
  site_id: str,
  body: SiteUpdate,
  user: dict = Depends(get_current_user),
):
    oid = _oid(site_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Site not found")
    coll = get_sites_collection()
    doc = coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Site not found")
    if doc.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can edit")
    coll.update_one(
        {"_id": oid},
        {"$set": {"name": body.name, "url": body.url, "updated_at": _now()}},
    )
    doc = coll.find_one({"_id": oid})
    return _site_doc_to_out(doc)


@router.delete("/sites/{site_id}", status_code=204)
def delete_site(
  site_id: str,
  user: dict = Depends(get_current_user),
):
    oid = _oid(site_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Site not found")
    coll = get_sites_collection()
    doc = coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Site not found")
    if doc.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can delete")
    coll.delete_one({"_id": oid})
    # Optionally delete pages/parsed under this site (cascade)
    pages_coll = get_pages_collection()
    parsed_coll = get_parsed_collection()
    for p in pages_coll.find({"site_id": site_id}):
        parsed_coll.delete_many({"page_id": str(p["_id"])})
    pages_coll.delete_many({"site_id": site_id})
    return None


@router.patch("/sites/{site_id}/allowed-for", response_model=SiteOut)
def set_site_allowed_for(
  site_id: str,
  body: SiteAllowedForUpdate,
  user: dict = Depends(get_current_user),
):
    require_admin(user)
    oid = _oid(site_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Site not found")
    coll = get_sites_collection()
    doc = coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Site not found")
    coll.update_one(
        {"_id": oid},
        {"$set": {"allowed_for": body.allowed_for, "updated_at": _now()}},
    )
    doc = coll.find_one({"_id": oid})
    return _site_doc_to_out(doc)


# --- Pages ---
def _page_doc_to_out(d: dict) -> PageOut:
    return PageOut(
        id=str(d["_id"]),
        title=d.get("title"),
        url=d["url"],
        site_id=d["site_id"],
        created_by=d.get("created_by"),
        allowed_for=d.get("allowed_for") or [],
        created_at=d.get("created_at", _now()),
        updated_at=d.get("updated_at", _now()),
    )


def _page_with_site(d: dict, site_name: str | None) -> PageOutWithSite:
    out = _page_doc_to_out(d)
    return PageOutWithSite(**out.model_dump(), site_name=site_name)


def _visible_site_ids(user: dict) -> list[str] | None:
    if user.get("role") == "admin":
        return None  # all
    sites = get_sites_collection()
    cursor = sites.find({
        "$or": [{"created_by": user["id"]}, {"allowed_for": user["id"]}]
    })
    return [str(d["_id"]) for d in cursor]


@router.get("/pages", response_model=list[PageOutWithSite])
def list_pages(
    site_id: str | None = None,
    user: Annotated[dict | None, Depends(get_current_user_optional)] = None,
):
    if not user:
        return []
    pages_coll = get_pages_collection()
    sites_coll = get_sites_collection()
    site_ids = _visible_site_ids(user)
    q = {}
    if site_id:
        if site_ids is not None and site_id not in site_ids:
            return []
        q["site_id"] = site_id
    else:
        if site_ids is not None:
            q["site_id"] = {"$in": site_ids}
    cursor = pages_coll.find(q).sort("created_at", 1)
    result = []
    for d in cursor:
        if site_ids is not None and d["site_id"] not in site_ids:
            continue
        if not can_see_item(user, d.get("created_by"), d.get("allowed_for")):
            continue
        site = sites_coll.find_one({"_id": _oid(d["site_id"])}) if d.get("site_id") else None
        result.append(_page_with_site(d, site["name"] if site else None))
    return result


@router.get("/pages/{page_id}", response_model=PageOutWithSite)
def get_page(
  page_id: str,
  user: dict = Depends(get_current_user),
):
    oid = _oid(page_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Page not found")
    pages_coll = get_pages_collection()
    doc = pages_coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Page not found")
    site = get_sites_collection().find_one({"_id": _oid(doc["site_id"])}) if doc.get("site_id") else None
    return _page_with_site(doc, site["name"] if site else None)


@router.post("/pages", response_model=PageOut)
def create_page(
  body: PageCreate,
  user: dict = Depends(get_current_user),
):
    site_oid = _oid(body.site_id)
    sites = get_sites_collection()
    site = sites.find_one({"_id": site_oid}) if site_oid else None
    if not site or not can_see_item(user, site.get("created_by"), site.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Site not found")
    now = _now()
    doc = {
        "title": body.title,
        "url": body.url,
        "site_id": body.site_id,
        "created_by": user["id"],
        "allowed_for": [],
        "created_at": now,
        "updated_at": now,
    }
    r = get_pages_collection().insert_one(doc)
    doc["_id"] = r.inserted_id
    return _page_doc_to_out(doc)


@router.put("/pages/{page_id}", response_model=PageOut)
def update_page(
  page_id: str,
  body: PageUpdate,
  user: dict = Depends(get_current_user),
):
    oid = _oid(page_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Page not found")
    coll = get_pages_collection()
    doc = coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Page not found")
    if doc.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can edit")
    site_oid = _oid(body.site_id)
    site = get_sites_collection().find_one({"_id": site_oid}) if site_oid else None
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    coll.update_one(
        {"_id": oid},
        {"$set": {"title": body.title, "url": body.url, "site_id": body.site_id, "updated_at": _now()}},
    )
    doc = coll.find_one({"_id": oid})
    return _page_doc_to_out(doc)


@router.delete("/pages/{page_id}", status_code=204)
def delete_page(
  page_id: str,
  user: dict = Depends(get_current_user),
):
    oid = _oid(page_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Page not found")
    coll = get_pages_collection()
    doc = coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Page not found")
    if doc.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can delete")
    get_parsed_collection().delete_many({"page_id": page_id})
    coll.delete_one({"_id": oid})
    return None


@router.patch("/pages/{page_id}/allowed-for", response_model=PageOut)
def set_page_allowed_for(
  page_id: str,
  body: PageAllowedForUpdate,
  user: dict = Depends(get_current_user),
):
    require_admin(user)
    oid = _oid(page_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Page not found")
    coll = get_pages_collection()
    doc = coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Page not found")
    coll.update_one(
        {"_id": oid},
        {"$set": {"allowed_for": body.allowed_for, "updated_at": _now()}},
    )
    doc = coll.find_one({"_id": oid})
    return _page_doc_to_out(doc)


# --- Parsed ---
def _parsed_doc_to_out(d: dict) -> ParsedOut:
    return ParsedOut(
        id=str(d["_id"]),
        page_id=d["page_id"],
        name=d.get("name"),
        data=d.get("data", ""),
        info=d.get("info"),
        is_verified=d.get("is_verified", False),
        created_by=d.get("created_by"),
        allowed_for=d.get("allowed_for") or [],
        created_at=d.get("created_at", _now()),
        updated_at=d.get("updated_at", _now()),
    )


def _parsed_with_page(d: dict, page_title: str | None, page_url: str | None) -> ParsedOutWithPage:
    out = _parsed_doc_to_out(d)
    return ParsedOutWithPage(**out.model_dump(), page_title=page_title, page_url=page_url)


@router.get("/parsed", response_model=list[ParsedOutWithPage])
def list_parsed(
    page_id: str | None = None,
    user: Annotated[dict | None, Depends(get_current_user_optional)] = None,
):
    if not user:
        return []
    parsed_coll = get_parsed_collection()
    pages_coll = get_pages_collection()
    site_ids = _visible_site_ids(user)
    visible_page_ids = []
    if page_id:
        oid = _oid(page_id)
        if not oid:
            return []
        p = pages_coll.find_one({"_id": oid})
        if not p or not can_see_item(user, p.get("created_by"), p.get("allowed_for")):
            return []
        visible_page_ids = [page_id]
    else:
        page_filter = {"site_id": {"$in": site_ids}} if site_ids is not None else {}
        for p in pages_coll.find(page_filter):
            if site_ids is not None and p.get("site_id") not in site_ids:
                continue
            if can_see_item(user, p.get("created_by"), p.get("allowed_for")):
                visible_page_ids.append(str(p["_id"]))
    q = {"page_id": {"$in": visible_page_ids}} if visible_page_ids else {"page_id": "impossible"}
    cursor = parsed_coll.find(q).sort("created_at", 1)
    result = []
    for d in cursor:
        if not can_see_item(user, d.get("created_by"), d.get("allowed_for")):
            continue
        page = pages_coll.find_one({"_id": _oid(d["page_id"])}) if d.get("page_id") else None
        result.append(_parsed_with_page(
            d,
            page.get("title") if page else None,
            page.get("url") if page else None,
        ))
    return result


@router.get("/parsed/{parsed_id}", response_model=ParsedOutWithPage)
def get_parsed(
  parsed_id: str,
  user: dict = Depends(get_current_user),
):
    oid = _oid(parsed_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Parsed not found")
    coll = get_parsed_collection()
    doc = coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Parsed not found")
    page = get_pages_collection().find_one({"_id": _oid(doc["page_id"])}) if doc.get("page_id") else None
    return _parsed_with_page(
        doc,
        page.get("title") if page else None,
        page.get("url") if page else None,
    )


@router.post("/parsed", response_model=ParsedOut)
def create_parsed(
  body: ParsedCreate,
  user: dict = Depends(get_current_user),
):
    page_oid = _oid(body.page_id)
    pages = get_pages_collection()
    page = pages.find_one({"_id": page_oid}) if page_oid else None
    if not page or not can_see_item(user, page.get("created_by"), page.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Page not found")
    now = _now()
    doc = {
        "page_id": body.page_id,
        "name": body.name,
        "data": body.data,
        "info": body.info,
        "is_verified": body.is_verified,
        "created_by": user["id"],
        "allowed_for": [],
        "created_at": now,
        "updated_at": now,
    }
    r = get_parsed_collection().insert_one(doc)
    doc["_id"] = r.inserted_id
    return _parsed_doc_to_out(doc)


@router.put("/parsed/{parsed_id}", response_model=ParsedOut)
def update_parsed(
  parsed_id: str,
  body: ParsedUpdate,
  user: dict = Depends(get_current_user),
):
    oid = _oid(parsed_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Parsed not found")
    coll = get_parsed_collection()
    doc = coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Parsed not found")
    if doc.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can edit")
    page_oid = _oid(body.page_id)
    page = get_pages_collection().find_one({"_id": page_oid}) if page_oid else None
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    coll.update_one(
        {"_id": oid},
        {"$set": {
            "page_id": body.page_id,
            "name": body.name,
            "data": body.data,
            "info": body.info,
            "is_verified": body.is_verified,
            "updated_at": _now(),
        }},
    )
    doc = coll.find_one({"_id": oid})
    return _parsed_doc_to_out(doc)


@router.delete("/parsed/{parsed_id}", status_code=204)
def delete_parsed(
  parsed_id: str,
  user: dict = Depends(get_current_user),
):
    oid = _oid(parsed_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Parsed not found")
    coll = get_parsed_collection()
    doc = coll.find_one({"_id": oid})
    if not doc or not can_see_item(user, doc.get("created_by"), doc.get("allowed_for")):
        raise HTTPException(status_code=404, detail="Parsed not found")
    if doc.get("created_by") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only creator or admin can delete")
    coll.delete_one({"_id": oid})
    return None


@router.patch("/parsed/{parsed_id}/allowed-for", response_model=ParsedOut)
def set_parsed_allowed_for(
  parsed_id: str,
  body: ParsedAllowedForUpdate,
  user: dict = Depends(get_current_user),
):
    require_admin(user)
    oid = _oid(parsed_id)
    if not oid:
        raise HTTPException(status_code=404, detail="Parsed not found")
    coll = get_parsed_collection()
    doc = coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Parsed not found")
    coll.update_one(
        {"_id": oid},
        {"$set": {"allowed_for": body.allowed_for, "updated_at": _now()}},
    )
    doc = coll.find_one({"_id": oid})
    return _parsed_doc_to_out(doc)


# --- Bulk import ---
def _parsed_data_to_str(data: str | dict) -> str:
    if isinstance(data, dict):
        return json.dumps(data)
    return str(data)


@router.post("/import-bulk", response_model=ImportBulkResult)
def import_bulk(
  body: ImportBulkBody,
  user: dict = Depends(get_current_user),
):
    result = ImportBulkResult()
    sites_coll = get_sites_collection()
    pages_coll = get_pages_collection()
    parsed_coll = get_parsed_collection()
    now = _now()
    uid = user["id"]

    for site_item in body.sites:
        try:
            site = sites_coll.find_one({"url": site_item.url})
            if site is None:
                doc = {
                    "name": site_item.name,
                    "url": site_item.url,
                    "created_by": uid,
                    "allowed_for": [],
                    "created_at": now,
                    "updated_at": now,
                }
                r = sites_coll.insert_one(doc)
                site_id = str(r.inserted_id)
                result.sites_created += 1
            else:
                site_id = str(site["_id"])
                result.sites_matched += 1

            for page_item in site_item.pages:
                try:
                    page = pages_coll.find_one({"site_id": site_id, "url": page_item.url})
                    if page is None:
                        doc = {
                            "title": page_item.title,
                            "url": page_item.url,
                            "site_id": site_id,
                            "created_by": uid,
                            "allowed_for": [],
                            "created_at": now,
                            "updated_at": now,
                        }
                        r = pages_coll.insert_one(doc)
                        page_id = str(r.inserted_id)
                        result.pages_created += 1
                    else:
                        page_id = str(page["_id"])
                        result.pages_matched += 1

                    for parsed_item in page_item.parsed:
                        try:
                            data_str = _parsed_data_to_str(parsed_item.data)
                            name_val = parsed_item.name if parsed_item.name else None
                            q = {"page_id": page_id, "name": name_val} if name_val else {"page_id": page_id, "name": None}
                            existing = parsed_coll.find_one(q)
                            if existing:
                                parsed_coll.update_one(
                                    {"_id": existing["_id"]},
                                    {"$set": {"data": data_str, "info": parsed_item.info, "is_verified": parsed_item.is_verified, "updated_at": now}},
                                )
                                result.parsed_updated += 1
                            else:
                                parsed_coll.insert_one({
                                    "page_id": page_id,
                                    "name": name_val,
                                    "data": data_str,
                                    "info": parsed_item.info,
                                    "is_verified": parsed_item.is_verified,
                                    "created_by": uid,
                                    "allowed_for": [],
                                    "created_at": now,
                                    "updated_at": now,
                                })
                                result.parsed_created += 1
                        except Exception as e:
                            result.errors.append(f"Parsed error: {e!s}")
                except Exception as e:
                    result.errors.append(f"Page {page_item.url!r}: {e!s}")
        except Exception as e:
            result.errors.append(f"Site {site_item.url!r}: {e!s}")
    return result
