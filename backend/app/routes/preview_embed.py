from fastapi import APIRouter, HTTPException, Query

from app.embed_check import check_url_embeddable

router = APIRouter(prefix="/preview", tags=["preview"])


@router.get("/embed-check")
def preview_embed_check(
    url: str = Query(..., min_length=1, description="Article URL to inspect"),
    parent: str | None = Query(
        None,
        description="Browser origin of the Studio app (e.g. http://localhost:5173), for CSP frame-ancestors",
    ),
):
    """
    Check whether a page is likely embeddable in an iframe from this Studio origin.
    Used to avoid loading URLs that will be blocked (X-Frame-Options / CSP), which spam the console.
    """
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="url must start with http:// or https://")
    result = check_url_embeddable(url, parent.strip() if parent else None)
    return result
