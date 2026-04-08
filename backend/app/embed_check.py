"""Detect whether a URL is likely embeddable in an iframe from a given parent origin (X-Frame-Options / CSP)."""

from __future__ import annotations

import ipaddress
import re
import ssl
import urllib.error
import urllib.request
from urllib.parse import urlparse

import certifi

USER_AGENT = "NewsParserStudio-EmbedCheck/1.0"


def _normalize_origin(url: str) -> str:
    p = urlparse(url.strip())
    if not p.scheme or not p.netloc:
        return ""
    scheme = p.scheme.lower()
    host = (p.hostname or "").lower()
    port = p.port
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        return f"{scheme}://{host}:{port}"
    return f"{scheme}://{host}"


def _url_safe_for_fetch(url: str) -> tuple[bool, str | None]:
    try:
        p = urlparse(url)
    except Exception:
        return False, "Invalid URL"
    if p.scheme not in ("http", "https"):
        return False, "Only http and https URLs are allowed"
    if not p.netloc:
        return False, "Missing host"
    host = (p.hostname or "").lower()
    if host in ("localhost",):
        return False, "Host not allowed"
    if host.startswith("[") and host.endswith("]"):
        host = host[1:-1]
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
            return False, "Host not allowed"
    except ValueError:
        pass
    return True, None


def _headers_dict(msg) -> dict[str, str]:
    return {k.lower(): v for k, v in msg.items()}


def _x_frame_options_blocks(xfo: str | None) -> bool:
    if not xfo or not str(xfo).strip():
        return False
    v = str(xfo).strip().upper()
    if v in ("DENY", "SAMEORIGIN"):
        return True
    if v.startswith("ALLOW-FROM"):
        return True
    return False


def _extract_frame_ancestors_tokens(csp: str) -> list[str] | None:
    if not csp:
        return None
    for part in csp.split(";"):
        part = part.strip()
        if not part.lower().startswith("frame-ancestors"):
            continue
        rest = part[len("frame-ancestors") :].strip()
        return re.split(r"\s+", rest) if rest else []
    return None


def _csp_frame_ancestors_allows_embedding(
    csp: str | None, final_url: str, parent_origin: str | None
) -> bool | None:
    """
    None = no frame-ancestors directive (or inconclusive).
    True/False = we think embedding from parent_origin is allowed or not.
    """
    if not csp:
        return None
    tokens = _extract_frame_ancestors_tokens(csp)
    if tokens is None:
        return None

    parent = _normalize_origin(parent_origin) if parent_origin else ""
    resource_origin = _normalize_origin(final_url)

    normalized: list[str] = []
    for raw in tokens:
        t = raw.strip().strip("'\"")
        if t.lower() == "none":
            normalized.append("none")
        elif t == "*":
            normalized.append("*")
        elif t.lower() == "self":
            normalized.append(f"origin:{resource_origin}")
        elif "://" in t:
            normalized.append(f"origin:{_normalize_origin(t)}")
        else:
            normalized.append(f"raw:{t}")

    if "*" in normalized:
        return True
    if normalized == ["none"] or (len(normalized) == 1 and normalized[0] == "none"):
        return False

    origins_allowed: set[str] = set()
    has_none = False
    for n in normalized:
        if n == "none":
            has_none = True
        elif n.startswith("origin:"):
            origins_allowed.add(n[7:])

    if has_none and not origins_allowed:
        return False

    if not parent:
        # Without knowing the studio origin, explicit origin lists are treated as "likely blocked"
        if origins_allowed:
            return False
        return None

    if parent in origins_allowed:
        return True

    # Only 'self' -> origins_allowed == { resource_origin }; parent must match framed site
    if origins_allowed and parent not in origins_allowed:
        return False

    return None


def fetch_url_headers(url: str) -> tuple[dict[str, str], str]:
    """
    Returns (headers lower-case keys, final URL after redirects).
    Raises on hard failures.
    """
    ctx = ssl.create_default_context(cafile=certifi.where())
    headers_req = {"User-Agent": USER_AGENT}

    def do_head() -> tuple[dict[str, str], str]:
        req = urllib.request.Request(url, headers=headers_req, method="HEAD")
        with urllib.request.urlopen(req, timeout=12, context=ctx) as r:
            return _headers_dict(r.headers), r.geturl()

    def do_get_range() -> tuple[dict[str, str], str]:
        h = {**headers_req, "Range": "bytes=0-0"}
        req = urllib.request.Request(url, headers=h, method="GET")
        with urllib.request.urlopen(req, timeout=12, context=ctx) as r:
            return _headers_dict(r.headers), r.geturl()

    try:
        return do_head()
    except urllib.error.HTTPError as e:
        if e.code in (405, 501):
            try:
                return do_get_range()
            except urllib.error.HTTPError as e2:
                hdrs = _headers_dict(e2.headers) if e2.headers else {}
                return hdrs, getattr(e2, "url", None) or url
        hdrs = _headers_dict(e.headers) if e.headers else {}
        return hdrs, getattr(e, "url", None) or url


def analyze_embed_headers(
    headers: dict[str, str], final_url: str, parent_origin: str | None
) -> tuple[bool, str | None]:
    """
    Returns (embeddable, reason_if_not).
    """
    xfo = headers.get("x-frame-options")
    if _x_frame_options_blocks(xfo):
        return False, "The site sends X-Frame-Options (or equivalent) and does not allow in-app preview."

    csp = headers.get("content-security-policy")
    decision = _csp_frame_ancestors_allows_embedding(csp, final_url, parent_origin)
    if decision is False:
        return False, "Content-Security-Policy frame-ancestors does not allow this app to embed the page."

    return True, None


def check_url_embeddable(url: str, parent_origin: str | None) -> dict:
    ok, err = _url_safe_for_fetch(url)
    if not ok:
        return {"embeddable": False, "reason": err, "final_url": None}

    try:
        headers, final_url = fetch_url_headers(url)
    except urllib.error.HTTPError as e:
        return {
            "embeddable": True,
            "reason": f"Could not inspect headers (HTTP {e.code}); preview may still fail.",
            "final_url": e.url or url,
        }
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return {
            "embeddable": True,
            "reason": f"Could not reach URL ({e!s}); trying preview anyway.",
            "final_url": None,
        }

    embeddable, reason = analyze_embed_headers(headers, final_url, parent_origin)
    return {"embeddable": embeddable, "reason": reason, "final_url": final_url}
