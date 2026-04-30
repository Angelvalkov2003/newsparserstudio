import json
import re
from datetime import datetime, timezone
from bson import ObjectId

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.routes.auth import _get_current_user_id_and_role
from app.parsed_normalize import normalize_parsed_data_object
from app.routes.parsed import _validate_parsed_data

router = APIRouter(tags=["import-bulk"])


class ParsedBulkItem(BaseModel):
    name: str | None = None
    data: str | dict = ""
    info: str | None = None
    is_verified: bool = False
    notes: str | None = None


class PageBulkItem(BaseModel):
    title: str | None = None
    url: str
    notes: str | None = None
    parsed: list[ParsedBulkItem] | None = None


class SiteBulkItem(BaseModel):
    name: str
    url: str
    pages: list[PageBulkItem] | None = None


class ImportBulkBody(BaseModel):
    sites: list[SiteBulkItem]


@router.post("/import-bulk")
def import_bulk(
    body: ImportBulkBody,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    sites_created = sites_matched = pages_created = pages_matched = parsed_created = parsed_updated = 0
    errors = []

    for site_item in body.sites:
        url = site_item.url.strip()
        if not url:
            continue
        site_doc = db["sites"].find_one({"url": url})
        name_trim = site_item.name.strip() if site_item.name else ""
        if not site_doc and name_trim:
            rx = re.compile(f"^{re.escape(name_trim)}$", re.IGNORECASE)
            cur = db["sites"].find({"name": rx}).sort("_id", -1).limit(1)
            site_doc = next(cur, None)
        if site_doc:
            site_id = str(site_doc["_id"])
            sites_matched += 1
        else:
            doc = {
                "name": site_item.name.strip(),
                "url": url,
                "created_by": user_id,
                "allowed_for": [user_id],
                "created_at": now,
                "updated_at": now,
            }
            r = db["sites"].insert_one(doc)
            site_id = str(r.inserted_id)
            sites_created += 1

        for page_item in (site_item.pages or []):
            page_url = page_item.url.strip()
            if not page_url:
                continue
            page_doc = db["pages"].find_one({"site_id": site_id, "url": page_url})
            if page_doc:
                page_id = str(page_doc["_id"])
                pages_matched += 1
            else:
                doc = {
                    "title": page_item.title.strip() if page_item.title else None,
                    "url": page_url,
                    "site_id": site_id,
                    "notes": page_item.notes.strip() if page_item.notes else None,
                    "created_by": user_id,
                    "allowed_for": [user_id],
                    "created_at": now,
                    "updated_at": now,
                }
                r = db["pages"].insert_one(doc)
                page_id = str(r.inserted_id)
                pages_created += 1

            for p in (page_item.parsed or []):
                try:
                    if isinstance(p.data, dict):
                        obj = p.data
                    else:
                        obj = json.loads(p.data)
                    if not isinstance(obj, dict):
                        errors.append("Parsed data: must be a JSON object with metadata and components.")
                        continue
                    normalized = normalize_parsed_data_object(obj)
                    data_str = json.dumps(normalized, ensure_ascii=False)
                    _validate_parsed_data(data_str)
                except json.JSONDecodeError as e:
                    errors.append(f"Parsed data: invalid JSON ({e.msg}).")
                    continue
                except HTTPException as e:
                    errors.append(f"Parsed data validation: {e.detail}")
                    continue
                try:
                    doc = {
                        "page_id": page_id,
                        "name": p.name.strip() if p.name else None,
                        "data": data_str,
                        "info": p.info.strip() if p.info else None,
                        "is_verified": p.is_verified,
                        "notes": p.notes.strip() if p.notes else None,
                        "created_by": user_id,
                        "allowed_for": [user_id],
                        "created_at": now,
                        "updated_at": now,
                    }
                    db["parsed"].insert_one(doc)
                    parsed_created += 1
                except Exception as e:
                    errors.append(str(e))

    return {
        "sites_created": sites_created,
        "sites_matched": sites_matched,
        "pages_created": pages_created,
        "pages_matched": pages_matched,
        "parsed_created": parsed_created,
        "parsed_updated": parsed_updated,
        "errors": errors,
    }
