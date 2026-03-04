"""
API routes for site, page, parsed.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Site, Page, Parsed
from schemas import (
    SiteCreate,
    SiteOut,
    PageCreate,
    PageOut,
    PageOutWithSite,
    ParsedCreate,
    ParsedOut,
    ParsedOutWithPage,
)

router = APIRouter(tags=["api"])


# --- Sites ---
@router.get("/sites", response_model=list[SiteOut])
def list_sites(db: Session = Depends(get_db)):
    return db.query(Site).order_by(Site.id).all()


@router.post("/sites", response_model=SiteOut)
def create_site(body: SiteCreate, db: Session = Depends(get_db)):
    site = Site(name=body.name, url=body.url)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


# --- Pages ---
@router.get("/pages", response_model=list[PageOutWithSite])
def list_pages(db: Session = Depends(get_db), site_id: int | None = None):
    q = db.query(Page).order_by(Page.id)
    if site_id is not None:
        q = q.filter(Page.site_id == site_id)
    items = q.all()
    return [
        PageOutWithSite(
            **PageOut.model_validate(p).model_dump(),
            site_name=p.site.name if p.site else None,
        )
        for p in items
    ]


@router.post("/pages", response_model=PageOut)
def create_page(body: PageCreate, db: Session = Depends(get_db)):
    site = db.get(Site, body.site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    page = Page(title=body.title, url=body.url, site_id=body.site_id)
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


# --- Parsed ---
@router.get("/parsed", response_model=list[ParsedOutWithPage])
def list_parsed(db: Session = Depends(get_db), page_id: int | None = None):
    q = db.query(Parsed).order_by(Parsed.id)
    if page_id is not None:
        q = q.filter(Parsed.page_id == page_id)
    items = q.all()
    return [
        ParsedOutWithPage(
            **ParsedOut.model_validate(r).model_dump(),
            page_title=r.page.title if r.page else None,
            page_url=r.page.url if r.page else None,
        )
        for r in items
    ]


@router.post("/parsed", response_model=ParsedOut)
def create_parsed(body: ParsedCreate, db: Session = Depends(get_db)):
    page = db.get(Page, body.page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    parsed = Parsed(
        page_id=body.page_id,
        name=body.name,
        data=body.data,
        info=body.info,
        is_verified=body.is_verified,
    )
    db.add(parsed)
    db.commit()
    db.refresh(parsed)
    return parsed
