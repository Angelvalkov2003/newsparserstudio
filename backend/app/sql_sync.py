from __future__ import annotations

import json
from datetime import datetime, timezone
from urllib.parse import urlparse

import pymysql
from pymysql.cursors import DictCursor
from pymongo import ReturnDocument

from app.config import (
    SQL_SYNC_BATCH_SIZE,
    SQL_SYNC_DB,
    SQL_SYNC_ENABLED,
    SQL_SYNC_HOST,
    SQL_SYNC_PASS,
    SQL_SYNC_PORT,
    SQL_SYNC_USER,
)
from app.database import get_db
from app.parsed_normalize import normalize_parsed_data_object

CHECKPOINT_NAME = "tpf2_parse_to_md"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _pick_parse_time(parsed_obj: dict) -> str:
    meta = parsed_obj.get("metadata") if isinstance(parsed_obj, dict) else {}
    if isinstance(meta, dict):
        for key in ("parse_datetime", "document_last_update_date", "document_date"):
            val = meta.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
    return _now_iso()


def _ensure_owner_user_id(db) -> str:
    # Prefer an admin user for imported records visibility.
    owner = db["users"].find_one({"role": "admin"})
    if not owner:
        owner = db["users"].find_one({})
    if not owner:
        raise RuntimeError("No users found in MongoDB. Create at least one user first.")
    return str(owner["_id"])


def _domain_root(article_url: str) -> str:
    parsed = urlparse(article_url)
    return f"{parsed.scheme}://{parsed.netloc}/" if parsed.scheme and parsed.netloc else ""


def _load_checkpoint(db) -> int:
    doc = db["sync_checkpoints"].find_one({"name": CHECKPOINT_NAME})
    return int(doc.get("last_id", 0)) if doc else 0


def _save_checkpoint(db, last_id: int) -> None:
    db["sync_checkpoints"].update_one(
        {"name": CHECKPOINT_NAME},
        {"$set": {"last_id": int(last_id), "updated_at": _now_iso()}},
        upsert=True,
    )


def _sql_connection():
    return pymysql.connect(
        host=SQL_SYNC_HOST,
        port=SQL_SYNC_PORT,
        user=SQL_SYNC_USER,
        password=SQL_SYNC_PASS,
        database=SQL_SYNC_DB,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )


def run_sql_sync(batch_size: int | None = None) -> dict:
    if not SQL_SYNC_ENABLED:
        raise RuntimeError("SQL sync is disabled. Set SQL_SYNC_ENABLED=true.")
    if not SQL_SYNC_USER:
        raise RuntimeError("DB_USER is not configured.")

    db = get_db()
    owner_user_id = _ensure_owner_user_id(db)
    limit = int(batch_size or SQL_SYNC_BATCH_SIZE)
    last_id = _load_checkpoint(db)

    query = """
        SELECT
            f.name AS site_name,
            p.source_id AS article_url,
            pp.data AS parsed_json,
            pp.id AS source_row_id
        FROM post_processing pp
        JOIN feed_processing_spec fps ON fps.id = pp.feed_processing_spec_id
        JOIN post p ON p.id = pp.post_id
        JOIN feed f ON f.id = p.feed_id
        WHERE fps.name = 'parse_to_md'
          AND pp.data IS NOT NULL
          AND pp.data <> ''
          AND pp.id > %(last_id)s
        ORDER BY pp.id ASC
        LIMIT %(limit)s
    """

    with _sql_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, {"last_id": last_id, "limit": limit})
            rows = cur.fetchall()

    processed = 0
    max_source_id = last_id
    sites_upserted = 0
    pages_upserted = 0
    parsed_upserted = 0
    skipped = 0

    for row in rows:
        source_row_id = int(row.get("source_row_id") or 0)
        if source_row_id > max_source_id:
            max_source_id = source_row_id

        site_name = (row.get("site_name") or "").strip()
        article_url = (row.get("article_url") or "").strip()
        parsed_json_raw = row.get("parsed_json")

        if not site_name or not article_url or not parsed_json_raw:
            skipped += 1
            continue

        try:
            parsed_obj = parsed_json_raw if isinstance(parsed_json_raw, dict) else json.loads(parsed_json_raw)
            parsed_obj = normalize_parsed_data_object(parsed_obj)
            parsed_json_str = json.dumps(parsed_obj, ensure_ascii=False)
        except Exception:
            skipped += 1
            continue

        now = _now_iso()
        site_doc = db["sites"].find_one_and_update(
            {"name": site_name},
            {
                "$set": {"name": site_name, "url": _domain_root(article_url), "updated_at": now},
                "$setOnInsert": {
                    "created_by": owner_user_id,
                    "allowed_for": [owner_user_id],
                    "created_at": now,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        site_id = str(site_doc["_id"])
        sites_upserted += 1

        page_doc = db["pages"].find_one_and_update(
            {"site_id": site_id, "url": article_url},
            {
                "$set": {
                    "site_id": site_id,
                    "url": article_url,
                    "title": (parsed_obj.get("metadata", {}) or {}).get("title"),
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_by": owner_user_id,
                    "allowed_for": [owner_user_id],
                    "created_at": now,
                    "notes": None,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        page_id = str(page_doc["_id"])
        pages_upserted += 1

        parse_time = _pick_parse_time(parsed_obj)
        parsed_name = f"sql-sync-{parse_time}"

        db["parsed"].update_one(
            {"page_id": page_id, "source_row_id": source_row_id},
            {
                "$set": {
                    "page_id": page_id,
                    "name": parsed_name,
                    "data": parsed_json_str,
                    "info": "Synced from MySQL tpf2.post_processing (parse_to_md)",
                    "is_verified": False,
                    "notes": None,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "source_row_id": source_row_id,
                    "created_by": owner_user_id,
                    "allowed_for": [owner_user_id],
                    "created_at": now,
                },
            },
            upsert=True,
        )
        parsed_upserted += 1
        processed += 1

    _save_checkpoint(db, max_source_id)
    return {
        "checkpoint_before": last_id,
        "checkpoint_after": max_source_id,
        "rows_fetched": len(rows),
        "processed": processed,
        "skipped": skipped,
        "sites_upserted": sites_upserted,
        "pages_upserted": pages_upserted,
        "parsed_upserted": parsed_upserted,
        "batch_size": limit,
    }
