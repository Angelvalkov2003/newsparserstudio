"""Normalize parser JSON (nested metadata.properties, nested component properties) to Studio flat shape."""

from __future__ import annotations

import json

# Optional ISO datetime strings on metadata (nullable in storage).
OPTIONAL_META_DATETIME_KEYS = ("document_date", "parse_datetime", "document_last_update_date")


def _clean_optional_meta_datetimes(meta: dict) -> None:
    for key in OPTIONAL_META_DATETIME_KEYS:
        if key not in meta:
            continue
        v = meta[key]
        if v is None:
            continue
        if isinstance(v, str):
            s = v.strip()
            if not s:
                del meta[key]
            else:
                meta[key] = s
        else:
            del meta[key]


def normalize_parsed_data_object(obj: dict) -> dict:
    """
    Normalize parser output to Studio shape:
    - metadata is flat (title/authors/categories/tags + optional datetimes)
    - components are flat (no nested properties)
    - component id optional (generated if missing)
    """
    if not isinstance(obj, dict):
        return {"metadata": {"title": "", "authors": [], "categories": [], "tags": []}, "components": []}

    metadata = obj.get("metadata") or {}
    if isinstance(metadata, dict) and isinstance(metadata.get("properties"), dict):
        props = metadata.get("properties") or {}
        out_meta = dict(props)
        out_meta["title"] = metadata.get("title") or props.get("title") or ""
    else:
        out_meta = dict(metadata) if isinstance(metadata, dict) else {}

    out_meta["authors"] = out_meta.get("authors") if isinstance(out_meta.get("authors"), list) else []
    out_meta["categories"] = out_meta.get("categories") if isinstance(out_meta.get("categories"), list) else []
    out_meta["tags"] = out_meta.get("tags") if isinstance(out_meta.get("tags"), list) else []
    out_meta["title"] = out_meta.get("title") if isinstance(out_meta.get("title"), str) else ""

    _clean_optional_meta_datetimes(out_meta)

    raw_components = obj.get("components")
    if isinstance(raw_components, dict):
        raw_components = raw_components.get("components")
    if not isinstance(raw_components, list):
        raw_components = []

    components: list[dict] = []
    for i, c in enumerate(raw_components):
        if not isinstance(c, dict):
            continue
        ctype = c.get("type")
        if not isinstance(ctype, str):
            continue
        if isinstance(c.get("properties"), dict):
            flat = {"type": ctype, **c.get("properties")}
            if "id" in c:
                flat["id"] = c["id"]
            c = flat
        if "id" not in c:
            c["id"] = f"sync-{i+1:04d}"
        components.append(c)

    return {"metadata": out_meta, "components": components}


def normalize_parsed_data_json_string(data_str: str) -> str:
    if not data_str or not data_str.strip():
        raise ValueError("data: Cannot be empty.")
    obj = json.loads(data_str)
    if not isinstance(obj, dict):
        raise ValueError("data: Must be a JSON object.")
    normalized = normalize_parsed_data_object(obj)
    return json.dumps(normalized, ensure_ascii=False)
