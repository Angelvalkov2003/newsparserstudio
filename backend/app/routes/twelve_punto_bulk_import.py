"""
Admin-only bulk import from Twelve Punto: queue jobs in MongoDB, process in background
with parallel HTTP fetches and sequential DB imports (avoids site creation races).
"""

from __future__ import annotations

import asyncio
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx
from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import (
    TWELVE_PUNTO_API_BASE,
    TWELVE_PUNTO_IMPORT_FETCH_CONCURRENCY,
    TWELVE_PUNTO_IMPORT_HTTP_RETRIES,
)
from app.database import get_db
from app.routes.auth import _get_current_user_id_and_role
from app.routes.import_bulk import execute_import_bulk
from app.twelve_punto_payload import (
    build_import_body_or_error,
    is_duplicate_twelve_punto_import,
    is_twelve_punto_failure_payload,
    post_display_title,
    site_display_name,
)

router = APIRouter(prefix="/twelve-punto", tags=["twelve-punto"])

JOBS_COLLECTION = "twelve_punto_bulk_import_jobs"
MAX_POST_IDS = 2000


class BulkImportBody(BaseModel):
    post_ids: list[str] = Field(min_length=1)


class ImportOneBody(BaseModel):
    post_id: str = Field(min_length=1)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fetch_post_detail_sync(post_id: str) -> dict:
    """GET post JSON or raise with message."""
    path_id = quote(str(post_id).strip(), safe="")
    url = f"{TWELVE_PUNTO_API_BASE}/posts/{path_id}"
    params = {"projection": "detail"}
    last_err = ""
    for attempt in range(TWELVE_PUNTO_IMPORT_HTTP_RETRIES):
        try:
            with httpx.Client(timeout=120.0) as client:
                r = client.get(url, params=params, headers={"Accept": "application/json"})
                text = r.text
                try:
                    body = json.loads(text) if text else None
                except json.JSONDecodeError:
                    body = None
                if r.status_code < 200 or r.status_code >= 300:
                    last_err = text[:500] if text else f"HTTP {r.status_code}"
                elif body is not None and is_twelve_punto_failure_payload(body):
                    last_err = (
                        (body.get("detail") if isinstance(body.get("detail"), str) else text)
                        or "API failure payload"
                    )[:500]
                else:
                    if isinstance(body, dict):
                        return body
                    last_err = "Unexpected JSON shape"
        except Exception as e:
            last_err = str(e)[:500]
        if attempt < TWELVE_PUNTO_IMPORT_HTTP_RETRIES - 1:
            time.sleep(0.35 * (2**attempt))
    raise RuntimeError(last_err or "fetch failed")


def _run_bulk_job(job_id: str) -> None:
    db = get_db()
    try:
        job = db[JOBS_COLLECTION].find_one({"_id": ObjectId(job_id)})
        if not job or job.get("status") not in ("queued", "running"):
            return
        post_ids: list[str] = job.get("post_ids") or []
        user_id = job.get("user_id")
        if not user_id or not post_ids:
            db[JOBS_COLLECTION].update_one(
                {"_id": ObjectId(job_id)},
                {"$set": {"status": "failed", "finished_at": _now_iso(), "error": "Invalid job payload"}},
            )
            return

        db[JOBS_COLLECTION].update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "running", "started_at": _now_iso(), "progress_done": 0}},
        )

        succeeded_rows: list[dict[str, str]] = []
        skipped_rows: list[dict[str, str]] = []
        failed_rows: list[dict[str, str]] = []

        REIMPORT_NOTE = "Already imported — imported again."

        def row_ok(pid: str, post: dict, site_nm: str, note: str | None = None) -> dict[str, str]:
            row: dict[str, str] = {
                "post_id": pid,
                "site_name": site_nm,
                "title": post_display_title(post),
            }
            if note:
                row["note"] = note
            return row

        def row_fail(pid: str, post: dict | None, site_nm: str, err: str) -> dict[str, str]:
            return {
                "post_id": pid,
                "site_name": site_nm,
                "title": post_display_title(post),
                "error": err[:1200],
            }

        def fetch_one(pid: str) -> tuple[str, dict | None, str | None]:
            try:
                post = _fetch_post_detail_sync(pid)
                return pid, post, None
            except Exception as e:
                return pid, None, str(e)

        fetched: dict[str, dict] = {}
        with ThreadPoolExecutor(
            max_workers=min(TWELVE_PUNTO_IMPORT_FETCH_CONCURRENCY, max(1, len(post_ids)))
        ) as ex:
            futs = {ex.submit(fetch_one, pid): pid for pid in post_ids}
            for fut in as_completed(futs):
                pid, post, err = fut.result()
                if err or post is None:
                    failed_rows.append(row_fail(pid, post, "—", err or "empty"))
                else:
                    fetched[pid] = post

        imported_total = 0
        skipped_ct = 0  # kept for API/back-compat; always 0 (re-imports go to succeeded_rows)

        post_rows = [
            {
                "post_id": pid,
                "site_name": site_display_name(fetched.get(pid)),
                "title": post_display_title(fetched.get(pid)),
            }
            for pid in post_ids
        ]
        db[JOBS_COLLECTION].update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "post_rows": post_rows,
                    "updated_at": _now_iso(),
                    "results": {
                        "imported": imported_total,
                        "skipped_duplicate": skipped_ct,
                        "succeeded_rows": succeeded_rows,
                        "skipped_rows": skipped_rows,
                        "failed_rows": failed_rows,
                    },
                }
            },
        )

        done = 0
        for pid in post_ids:
            post = fetched.get(pid)
            site_nm = site_display_name(post)
            if not post:
                done += 1
                db[JOBS_COLLECTION].update_one(
                    {"_id": ObjectId(job_id)},
                    {
                        "$set": {
                            "progress_done": done,
                            "updated_at": _now_iso(),
                            "results": {
                                "imported": imported_total,
                                "skipped_duplicate": skipped_ct,
                                "succeeded_rows": succeeded_rows,
                                "skipped_rows": skipped_rows,
                                "failed_rows": failed_rows,
                            },
                        }
                    },
                )
                continue
            was_duplicate = is_duplicate_twelve_punto_import(db, post)
            body, build_err = build_import_body_or_error(post)
            if body is None:
                failed_rows.append(row_fail(pid, post, site_nm, build_err or "Cannot build import payload."))
                done += 1
                db[JOBS_COLLECTION].update_one(
                    {"_id": ObjectId(job_id)},
                    {
                        "$set": {
                            "progress_done": done,
                            "updated_at": _now_iso(),
                            "results": {
                                "imported": imported_total,
                                "skipped_duplicate": skipped_ct,
                                "succeeded_rows": succeeded_rows,
                                "skipped_rows": skipped_rows,
                                "failed_rows": failed_rows,
                            },
                        }
                    },
                )
                continue
            try:
                res = execute_import_bulk(db, user_id, body)
                if res.get("errors"):
                    for e in res["errors"]:
                        failed_rows.append(row_fail(pid, post, site_nm, str(e)))
                else:
                    imported_total += int(res.get("parsed_created") or 0) + int(res.get("parsed_updated") or 0)
                    note = REIMPORT_NOTE if was_duplicate else None
                    succeeded_rows.append(row_ok(pid, post, site_nm, note))
            except Exception as e:
                failed_rows.append(row_fail(pid, post, site_nm, str(e)))
            done += 1
            db[JOBS_COLLECTION].update_one(
                {"_id": ObjectId(job_id)},
                {
                    "$set": {
                        "progress_done": done,
                        "updated_at": _now_iso(),
                        "results": {
                            "imported": imported_total,
                            "skipped_duplicate": skipped_ct,
                            "succeeded_rows": succeeded_rows,
                            "skipped_rows": skipped_rows,
                            "failed_rows": failed_rows,
                        },
                    }
                },
            )

        results: dict[str, Any] = {
            "imported": imported_total,
            "skipped_duplicate": skipped_ct,
            "succeeded_rows": succeeded_rows,
            "skipped_rows": skipped_rows,
            "failed_rows": failed_rows,
        }

        db[JOBS_COLLECTION].update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "status": "completed",
                    "finished_at": _now_iso(),
                    "results": results,
                    "updated_at": _now_iso(),
                }
            },
        )
    except Exception as e:
        db[JOBS_COLLECTION].update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "status": "failed",
                    "finished_at": _now_iso(),
                    "error": str(e)[:800],
                    "updated_at": _now_iso(),
                }
            },
        )


async def _run_bulk_job_async(job_id: str) -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_bulk_job, job_id)


@router.post("/bulk-import")
async def start_bulk_import(
    body: BulkImportBody,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    raw_ids = [str(x).strip() for x in body.post_ids if str(x).strip()]
    seen: set[str] = set()
    post_ids: list[str] = []
    for x in raw_ids:
        if x not in seen:
            seen.add(x)
            post_ids.append(x)
    if not post_ids:
        raise HTTPException(status_code=400, detail="No valid post_ids")
    if len(post_ids) > MAX_POST_IDS:
        raise HTTPException(status_code=400, detail=f"Too many post_ids (max {MAX_POST_IDS})")

    db = get_db()
    doc = {
        "user_id": user_id,
        "post_ids": post_ids,
        "status": "queued",
        "progress_done": 0,
        "total": len(post_ids),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "results": None,
        "error": None,
    }
    ins = db[JOBS_COLLECTION].insert_one(doc)
    job_id = str(ins.inserted_id)

    background_tasks.add_task(_run_bulk_job_async, job_id)

    return {
        "job_id": job_id,
        "total": len(post_ids),
        "status": "queued",
    }


@router.get("/bulk-import/{job_id}")
def get_bulk_import_status(
    job_id: str,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        oid = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job_id") from None
    db = get_db()
    job = db[JOBS_COLLECTION].find_one({"_id": oid})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if role != "admin" and job.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Job not found")

    out = {
        "job_id": job_id,
        "status": job.get("status"),
        "total": job.get("total"),
        "progress_done": job.get("progress_done"),
        "created_at": job.get("created_at"),
        "started_at": job.get("started_at"),
        "finished_at": job.get("finished_at"),
        "post_rows": job.get("post_rows"),
        "results": job.get("results"),
        "error": job.get("error"),
    }
    return out


@router.post("/import-one")
def import_one_twelve_punto_post(
    body: ImportOneBody,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    """Fetch one post from Twelve Punto and import into Studio (admin). Used for retry from bulk-import UI."""
    user_id, role = _get_current_user_id_and_role(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    pid = body.post_id.strip()
    if not pid:
        raise HTTPException(status_code=400, detail="post_id required")

    db = get_db()
    try:
        post = _fetch_post_detail_sync(pid)
    except Exception as e:
        return {
            "outcome": "failed",
            "post_id": pid,
            "title": "—",
            "site_name": "—",
            "error": str(e)[:1200],
            "parsed_created": 0,
        }

    title = post_display_title(post)
    site_nm = site_display_name(post)

    was_duplicate = is_duplicate_twelve_punto_import(db, post)

    imb, build_err = build_import_body_or_error(post)
    if imb is None:
        return {
            "outcome": "failed",
            "post_id": pid,
            "title": title,
            "site_name": site_nm,
            "error": (build_err or "Cannot build import payload.")[:1200],
            "parsed_created": 0,
        }

    try:
        res = execute_import_bulk(db, user_id, imb)
        if res.get("errors"):
            return {
                "outcome": "failed",
                "post_id": pid,
                "title": title,
                "site_name": site_nm,
                "error": ("; ".join(str(x) for x in res["errors"]))[:1200],
                "parsed_created": int(res.get("parsed_created") or 0),
            }
        created = int(res.get("parsed_created") or 0)
        updated = int(res.get("parsed_updated") or 0)
        return {
            "outcome": "imported",
            "post_id": pid,
            "title": title,
            "site_name": site_nm,
            "error": None,
            "parsed_created": created,
            "parsed_updated": updated,
            "reimported": bool(was_duplicate),
            "note": ("Already imported — imported again." if was_duplicate else None),
        }
    except Exception as e:
        return {
            "outcome": "failed",
            "post_id": pid,
            "title": title,
            "site_name": site_nm,
            "error": str(e)[:1200],
            "parsed_created": 0,
        }
