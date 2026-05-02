"""
Build ImportBulkBody from Twelve Punto post JSON (mirrors frontend utils/twelvePuntoImport.ts).
"""

from __future__ import annotations

import json
import re
from urllib.parse import quote, urljoin, urlparse

from pydantic import ValidationError

from app.config import TWELVE_PUNTO_RELATIVE_BASES_EXTRA
from app.routes.import_bulk import ImportBulkBody, PageBulkItem, ParsedBulkItem, SiteBulkItem

VALID_COMPONENT_TYPES = frozenset(
    {
        "heading",
        "paragraph",
        "image",
        "link",
        "code_block",
        "equation",
        "citation",
        "footnote",
        "horizontal_ruler",
        "list",
        "poll",
        "table",
        "video",
    }
)


def _pick_content_array(post: dict) -> list:
    top = post.get("content")
    if isinstance(top, list):
        return top
    data = post.get("data")
    if isinstance(data, dict):
        inner = data.get("content")
        if isinstance(inner, list):
            return inner
    if isinstance(data, str) and data.strip():
        try:
            parsed = json.loads(data)
            if isinstance(parsed, dict) and isinstance(parsed.get("content"), list):
                return parsed["content"]
        except json.JSONDecodeError:
            pass
    return []


def _flatten_content_block(raw) -> dict | None:
    if raw is None or not isinstance(raw, dict):
        return None
    t = raw.get("type")
    if not isinstance(t, str) or t not in VALID_COMPONENT_TYPES:
        return None
    props = raw.get("properties")
    if isinstance(props, dict):
        flat = {"type": t, **props}
        if isinstance(raw.get("id"), str):
            flat["id"] = raw["id"]
        return flat
    flat = {"type": t}
    if isinstance(raw.get("id"), str):
        flat["id"] = raw["id"]
    return flat


def _normalize_categories(raw) -> list:
    if not isinstance(raw, list):
        return []
    out = []
    for c in raw:
        if isinstance(c, str):
            out.append({"name": c})
        elif isinstance(c, dict) and isinstance(c.get("name"), str):
            out.append(c)
    return out


def _studio_parsed_from_post(post: dict) -> dict:
    title = post.get("title") if isinstance(post.get("title"), str) else ""
    blocks = _pick_content_array(post)
    components: list[dict] = []
    i = 0
    for b in blocks:
        flat = _flatten_content_block(b)
        if flat:
            if "id" not in flat or not isinstance(flat.get("id"), str):
                i += 1
                flat["id"] = f"12punto-{i}"
            components.append(flat)
    meta: dict = {
        "title": title,
        "authors": [],
        "categories": _normalize_categories(post.get("categories")),
        "tags": [],
    }
    if isinstance(post.get("published_at"), str) and post["published_at"].strip():
        meta["document_date"] = post["published_at"].strip()
    if isinstance(post.get("created_at"), str) and post["created_at"].strip():
        meta["parse_datetime"] = post["created_at"].strip()
    if isinstance(post.get("edited_at"), str) and post["edited_at"].strip():
        meta["document_last_update_date"] = post["edited_at"].strip()
    return {"metadata": meta, "components": components}


_HOSTISH = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?(?:\:[0-9]+)?$")
_URL_IN_JSON = re.compile(r"https?://[a-zA-Z0-9][^\s\"\'<>]{6,1200}", re.IGNORECASE)
_WWW_PATH_RE = re.compile(
    r"\bwww\.[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}(?:/[^\s\"'<>]*)?",
    re.IGNORECASE,
)
_ORIGIN_PREFIX_RE = re.compile(r"https?://[^/\s?#'\"<>]+", re.IGNORECASE)
_MAX_URL_DEPTH = 10

# Shipped defaults — no .env required. Order: auto-detected origins from post JSON come first at runtime.
_DEFAULT_RELATIVE_BASE_ORIGINS: tuple[str, ...] = (
    "https://www.iha.com.tr",
    "https://iha.com.tr",
    "https://www.hurriyet.com.tr",
    "https://www.milliyet.com.tr",
    "https://www.sabah.com.tr",
    "https://www.cnnturk.com",
    "https://www.ntv.com.tr",
    "https://www.trthaber.com",
    "https://www.aa.com.tr",
    "https://www.haberturk.com",
    "https://www.yenisafak.com",
    "https://www.takvim.com.tr",
    "https://www.fotomac.com.tr",
    "https://www.sozcu.com.tr",
    "https://www.dunya.com",
    "https://www.dha.com.tr",
    "https://www.mynet.com",
    "https://www.yandex.com.tr",
)

_URL_KEYS_FLAT = (
    "source_id",
    "url",
    "link",
    "article_url",
    "permalink",
    "canonical_url",
    "post_url",
    "web_url",
    "guid",
    "external_url",
    "share_url",
    "story_url",
    "href",
    "canonical",
    "original_url",
    "full_url",
    "page_url",
    "article_link",
    "link_url",
    "short_url",
)


def _gather_article_url_strings(post: dict) -> list[str]:
    """Collect possible URL fields from post and nested data."""
    out: list[str] = []
    seen: set[str] = set()

    def add(s: str | None) -> None:
        if isinstance(s, str) and s.strip():
            t = s.strip()
            if t not in seen:
                seen.add(t)
                out.append(t)

    for k in _URL_KEYS_FLAT:
        add(post.get(k) if isinstance(post.get(k), str) else None)
    data = post.get("data")
    if isinstance(data, dict):
        for k in _URL_KEYS_FLAT:
            v = data.get(k)
            add(v if isinstance(v, str) else None)
    elif isinstance(data, str) and data.strip():
        try:
            d = json.loads(data)
            if isinstance(d, dict):
                for k in _URL_KEYS_FLAT:
                    v = d.get(k)
                    add(v if isinstance(v, str) else None)
        except json.JSONDecodeError:
            pass
    return out


def _urls_from_content_blocks(post: dict) -> list[str]:
    """First-party links sometimes live only inside article components."""
    out: list[str] = []
    blocks = _pick_content_array(post)
    for b in blocks:
        if not isinstance(b, dict):
            continue
        props = b.get("properties")
        if isinstance(props, dict):
            for key in ("url", "href", "link", "canonical", "permalink"):
                v = props.get(key)
                if isinstance(v, str) and v.strip():
                    out.append(v.strip())
        for key in ("url", "href", "link"):
            v = b.get(key)
            if isinstance(v, str) and v.strip():
                out.append(v.strip())
    return out


def _deep_collect_urlish(obj, depth: int, out: list[str], seen: set[str]) -> None:
    if depth > _MAX_URL_DEPTH:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            lk = k.lower() if isinstance(k, str) else ""
            if isinstance(v, str) and v.strip():
                if any(x in lk for x in ("url", "link", "href", "permalink", "canonical", "source")):
                    t = v.strip()
                    if len(t) > 3 and t not in seen:
                        seen.add(t)
                        out.append(t)
            _deep_collect_urlish(v, depth + 1, out, seen)
    elif isinstance(obj, list):
        for v in obj:
            _deep_collect_urlish(v, depth + 1, out, seen)
    elif isinstance(obj, str):
        t = obj.strip()
        if len(t) < 7:
            return
        if t.startswith(("http://", "https://", "//")):
            if t not in seen:
                seen.add(t)
                out.append(t)
        elif t.startswith("/") and len(t) > 3:
            if t not in seen:
                seen.add(t)
                out.append(t)
        elif "/" in t and "." in t.split("/", 1)[0]:
            if t not in seen:
                seen.add(t)
                out.append(t)


def _urls_from_json_regex_blob(blob: str) -> list[str]:
    """Find absolute URLs embedded anywhere in the serialized post."""
    seen: set[str] = set()
    out: list[str] = []
    for m in _URL_IN_JSON.finditer(blob):
        u = m.group(0).rstrip(".,;)]}\"'")
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _www_candidates_from_blob(blob: str) -> list[str]:
    """Fragments like www.site.com.tr/haber/... without scheme → https candidates."""
    seen: set[str] = set()
    out: list[str] = []
    for m in _WWW_PATH_RE.finditer(blob):
        raw = m.group(0).rstrip(".,;)]}\"'")
        if not raw.lower().startswith("www."):
            continue
        cand = "https://" + raw
        if cand not in seen:
            seen.add(cand)
            out.append(cand)
    return out


def _merge_url_candidates(post: dict) -> list[str]:
    """Ordered, deduplicated candidates (structured first, then regex scan)."""
    seen: set[str] = set()
    merged: list[str] = []

    def extend(xs: list[str]) -> None:
        for x in xs:
            t = x.strip()
            if not t or t in seen:
                continue
            seen.add(t)
            merged.append(t)

    try:
        blob = json.dumps(post, ensure_ascii=False)
    except Exception:
        blob = ""

    extend(_gather_article_url_strings(post))
    extend(_urls_from_content_blocks(post))
    deep_out: list[str] = []
    deep_seen: set[str] = set()
    _deep_collect_urlish(post, 0, deep_out, deep_seen)
    extend(deep_out)
    extend(_urls_from_json_regex_blob(blob))
    extend(_www_candidates_from_blob(blob))
    return merged


def _origins_from_blob(blob: str) -> list[str]:
    """Extract https://host (no path) prefixes from serialized JSON for urljoin bases."""
    seen: set[str] = set()
    out: list[str] = []
    for m in _ORIGIN_PREFIX_RE.finditer(blob):
        o = m.group(0).rstrip("/")
        if "://" not in o:
            continue
        u = urlparse(o + "/")
        if u.scheme not in ("http", "https") or not u.netloc:
            continue
        origin = f"{u.scheme}://{u.netloc}"
        if origin not in seen:
            seen.add(origin)
            out.append(origin)
    return out


def _origins_from_absolute_candidates(pieces: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for p in pieces:
        abs_u = _coerce_string_to_absolute_url(p)
        if abs_u:
            u = urlparse(abs_u)
            if u.scheme in ("http", "https") and u.netloc:
                o = f"{u.scheme}://{u.netloc}"
                if o not in seen:
                    seen.add(o)
                    out.append(o)
    return out


def _unique_push(order: list[str], items: list[str]) -> None:
    seen = set(order)
    for x in items:
        t = x.rstrip("/")
        if t not in seen:
            seen.add(t)
            order.append(t)


def _effective_relative_bases(post: dict, pieces: list[str]) -> list[str]:
    """Bases for path-only joins: JSON-derived origins first, then shipped defaults, then optional env extra."""
    try:
        blob = json.dumps(post, ensure_ascii=False)
    except Exception:
        blob = ""
    bases: list[str] = []
    _unique_push(bases, _origins_from_blob(blob))
    _unique_push(bases, _origins_from_absolute_candidates(pieces))
    _unique_push(bases, list(_DEFAULT_RELATIVE_BASE_ORIGINS))
    _unique_push(bases, TWELVE_PUNTO_RELATIVE_BASES_EXTRA)
    return bases


def _first_path_segment(s: str) -> str:
    return s.strip().split("/", 1)[0]


def _looks_like_domain_segment(seg: str) -> bool:
    return bool(seg and "." in seg and _HOSTISH.match(seg))


def _coerce_string_to_absolute_url(s: str) -> str | None:
    """Turn protocol-relative, scheme-less host/path, or full URL into absolute http(s)."""
    t = s.strip()
    if not t:
        return None
    if t.startswith("//"):
        t = "https:" + t
    if t.startswith(("http://", "https://")):
        u = urlparse(t)
        if u.scheme in ("http", "https") and u.netloc:
            return t.split("#", 1)[0].rstrip() or None
        return None
    if t.startswith("/"):
        return None
    if "/" in t:
        head = t.split("/", 1)[0]
        if "." in head and _HOSTISH.match(head):
            cand = "https://" + t.lstrip("/")
            u = urlparse(cand)
            if u.scheme == "https" and u.netloc:
                return cand.split("#", 1)[0].rstrip() or None
    return None


# RFC 2606-style *.invalid host: browsing fails on purpose; Mongo gets stable site/page/parsed rows.
SYNTHETIC_ROOT_HOST = "12punto.article.invalid"


def is_synthetic_article_url(url: str) -> bool:
    try:
        h = urlparse(url).hostname or ""
        return h.endswith(SYNTHETIC_ROOT_HOST)
    except Exception:
        return False


def _synthetic_site_origin(post: dict) -> str:
    """One logical Studio site per Twelve Punto feed when using synthetic URLs."""
    fid = post.get("feed_id")
    if fid is not None and str(fid).strip() != "":
        return f"https://f-{str(fid).strip()}.{SYNTHETIC_ROOT_HOST}"
    return f"https://{SYNTHETIC_ROOT_HOST}"


def _synthetic_article_url(post: dict) -> str:
    """Stable page URL when API has no real article link (e.g. wire id in source_id)."""
    origin = _synthetic_site_origin(post).rstrip("/")
    raw = post.get("db_id") if post.get("db_id") is not None else post.get("id")
    if raw is not None:
        pid = str(raw).strip()
        if pid:
            return f"{origin}/p/{quote(pid, safe='')}"
    sid = post.get("source_id")
    if isinstance(sid, str) and sid.strip():
        return f"{origin}/wire/{quote(sid.strip(), safe='')}"
    raise ValueError("Cannot synthesize page URL: post has no db_id, id, or source_id.")


def _resolve_article_url_strict(post: dict) -> str:
    """
    Real absolute article URL only. Raises if none found (caller may fall back to synthetic).
    """
    pieces = _merge_url_candidates(post)
    bases = _effective_relative_bases(post, pieces)
    for p in pieces:
        abs_u = _coerce_string_to_absolute_url(p)
        if abs_u:
            return abs_u
    for p in pieces:
        if p.startswith("/"):
            for base in bases:
                joined = urljoin(base + "/", p)
                u = urlparse(joined)
                if u.scheme in ("http", "https") and u.netloc:
                    return joined.split("#", 1)[0].rstrip()
    for p in pieces:
        pt = p.strip()
        if pt.startswith(("http://", "https://", "//", "/")):
            continue
        if "/" not in pt:
            continue
        if _looks_like_domain_segment(_first_path_segment(pt)):
            continue
        for base in bases:
            joined = urljoin(base + "/", "/" + pt.lstrip("/"))
            u = urlparse(joined)
            if u.scheme in ("http", "https") and u.netloc:
                return joined.split("#", 1)[0].rstrip()
    raise ValueError(
        "Could not resolve a full article URL from this post (checked fields, nested data, content links, "
        "embedded http(s) text, www… fragments, and relative paths against auto-detected origins plus built-in defaults)."
    )


def resolve_article_url(post: dict) -> str:
    """
    Absolute article URL for Studio site/page.

    Falls back to a stable synthetic https URL under *.invalid when the API only has wire ids / no real link.
    """
    try:
        return _resolve_article_url_strict(post)
    except ValueError:
        return _synthetic_article_url(post)


def site_origin_and_name(post: dict) -> tuple[str, str]:
    page = resolve_article_url(post)
    u = urlparse(page)
    site_url = f"{u.scheme}://{u.netloc}"
    feed_name = post.get("feed_name") if isinstance(post.get("feed_name"), str) else ""
    feed_name = feed_name.strip()
    site_name = feed_name or (u.hostname or "") or site_url
    return site_url, site_name


def site_display_name(post: dict | None) -> str:
    """Human-readable site label for tables (feed name or hostname)."""
    if not post:
        return "—"
    try:
        _, name = site_origin_and_name(post)
        return name
    except Exception:
        fn = post.get("feed_name") if isinstance(post.get("feed_name"), str) else ""
        return fn.strip() or "—"


def page_url_from_post(post: dict) -> str:
    return resolve_article_url(post)


def _id_label(post: dict) -> str:
    raw = post.get("db_id") if post.get("db_id") is not None else post.get("id")
    if isinstance(raw, (int, float)):
        return str(int(raw)) if isinstance(raw, float) and raw == int(raw) else str(raw)
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return "post"


def build_import_bulk_body_from_twelve_punto_post(post: dict) -> ImportBulkBody:
    site_url, site_name = site_origin_and_name(post)
    page_url = page_url_from_post(post)
    title = post.get("title")
    page_title = title.strip() if isinstance(title, str) and title.strip() else None
    parsed_obj = _studio_parsed_from_post(post)
    id_label = _id_label(post)
    info_parts = [
        "Imported from 12punto",
        f"id={id_label}",
    ]
    if post.get("feed_id") is not None:
        info_parts.append(f"feed_id={post.get('feed_id')}")
    if is_synthetic_article_url(page_url):
        wire = post.get("source_id")
        if isinstance(wire, str) and wire.strip():
            info_parts.append(f"source_id={wire.strip()}")
        info_parts.append("synthetic page URL (no usable article link in API)")
    info_str = " · ".join(info_parts)
    body = ImportBulkBody(
        sites=[
            SiteBulkItem(
                name=site_name,
                url=site_url,
                pages=[
                    PageBulkItem(
                        title=page_title,
                        url=page_url,
                        parsed=[
                            ParsedBulkItem(
                                name=f"12punto-{id_label}",
                                data=parsed_obj,
                                info=info_str,
                                is_verified=False,
                                notes=None,
                            )
                        ],
                    )
                ],
            )
        ]
    )
    return body


def is_twelve_punto_failure_payload(body: object) -> bool:
    """Rough mirror of frontend isTwelvePuntoPostFailurePayload."""
    if body is None or not isinstance(body, dict):
        return False
    d = body.get("detail")
    if isinstance(d, list):
        return True
    if isinstance(d, str):
        for needle in (
            "Failed to get post",
            "OperationalError",
            "Out of sort memory",
            "Validation Error",
        ):
            if needle in d:
                return True
    inner = None
    if isinstance(d, dict):
        inner = d.get("detail")
    if isinstance(inner, str):
        for needle in ("Failed to get post", "OperationalError", "Out of sort memory"):
            if needle in inner:
                return True
    return False


def twelve_punto_parsed_name_for_post(post: dict) -> str:
    return f"12punto-{_id_label(post)}"


def is_duplicate_twelve_punto_import(db, post: dict) -> bool:
    """Idempotency: same page URL + same 12punto-{id} parsed name already exists."""
    try:
        page_url = page_url_from_post(post)
    except ValueError:
        return False
    page_doc = db["pages"].find_one({"url": page_url})
    if not page_doc:
        return False
    page_id = str(page_doc["_id"])
    name = twelve_punto_parsed_name_for_post(post)
    return db["parsed"].find_one({"page_id": page_id, "name": name}) is not None


def post_display_title(post: dict | None, max_len: int = 400) -> str:
    if not post:
        return "—"
    t = post.get("title")
    if isinstance(t, str) and t.strip():
        s = t.strip()
        return s if len(s) <= max_len else s[: max_len - 1] + "…"
    return "—"


def _import_payload_diagnostics(post: dict) -> str:
    """Short hints for operators when detail JSON omits fields needed for Studio import."""
    bits: list[str] = []
    try:
        resolve_article_url(post)
    except ValueError:
        bits.append(
            "No usable absolute article URL was found after scanning fields, nested JSON, content blocks, "
            "embedded links, and joining relative paths against auto-detected origins plus built-in defaults. "
            "Optional: set TWELVE_PUNTO_RELATIVE_BASES_EXTRA for rare publishers."
        )
    has_top_content = isinstance(post.get("content"), list) and len(post.get("content")) > 0
    data = post.get("data")
    has_nested_content = isinstance(data, dict) and isinstance(data.get("content"), list)
    if not has_top_content and not has_nested_content:
        bits.append("No article content blocks found (empty content / data.content); import may produce an empty article.")
    return " ".join(bits) if bits else ""


def build_import_body_or_error(post: dict) -> tuple[ImportBulkBody | None, str | None]:
    """
    Build ImportBulkBody or return English error message suitable for UI tables.
    """
    try:
        return build_import_bulk_body_from_twelve_punto_post(post), None
    except ValueError as e:
        diag = _import_payload_diagnostics(post)
        base = str(e).strip()
        if diag:
            return None, f"{base} {diag}".strip()
        return None, base or "Cannot build import payload from this post."
    except ValidationError as e:
        parts: list[str] = []
        for err in e.errors():
            loc = ".".join(str(x) for x in err.get("loc", ()))
            msg = err.get("msg", "invalid")
            parts.append(f"{loc}: {msg}" if loc else str(msg))
        joined = "; ".join(parts) if parts else "validation error"
        diag = _import_payload_diagnostics(post)
        tail = f" ({diag})" if diag else ""
        return None, f"Payload validation failed: {joined}.{tail}"


def safe_build_import_body(post: dict) -> ImportBulkBody | None:
    body, _err = build_import_body_or_error(post)
    return body
