"""
API routes for site, page, parsed.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Site, Page, Parsed
from schemas import (
    SiteCreate,
    SiteUpdate,
    SiteOut,
    PageCreate,
    PageUpdate,
    PageOut,
    PageOutWithSite,
    ParsedCreate,
    ParsedUpdate,
    ParsedOut,
    ParsedOutWithPage,
    ImportBulkBody,
    ImportBulkResult,
)

router = APIRouter(tags=["api"])


# --- Sites ---
@router.get("/sites", response_model=list[SiteOut])
def list_sites(db: Session = Depends(get_db)):
    return db.query(Site).order_by(Site.id).all()


@router.get("/sites/{site_id}", response_model=SiteOut)
def get_site(site_id: int, db: Session = Depends(get_db)):
    site = db.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


@router.post("/sites", response_model=SiteOut)
def create_site(body: SiteCreate, db: Session = Depends(get_db)):
    site = Site(name=body.name, url=body.url)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.put("/sites/{site_id}", response_model=SiteOut)
def update_site(site_id: int, body: SiteUpdate, db: Session = Depends(get_db)):
    site = db.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    site.name = body.name
    site.url = body.url
    db.commit()
    db.refresh(site)
    return site


@router.delete("/sites/{site_id}", status_code=204)
def delete_site(site_id: int, db: Session = Depends(get_db)):
    site = db.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site)
    db.commit()
    return None


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


@router.get("/pages/{page_id}", response_model=PageOutWithSite)
def get_page(page_id: int, db: Session = Depends(get_db)):
    page = db.get(Page, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return PageOutWithSite(
        **PageOut.model_validate(page).model_dump(),
        site_name=page.site.name if page.site else None,
    )


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


@router.put("/pages/{page_id}", response_model=PageOut)
def update_page(page_id: int, body: PageUpdate, db: Session = Depends(get_db)):
    page = db.get(Page, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    site = db.get(Site, body.site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    page.title = body.title
    page.url = body.url
    page.site_id = body.site_id
    db.commit()
    db.refresh(page)
    return page


@router.delete("/pages/{page_id}", status_code=204)
def delete_page(page_id: int, db: Session = Depends(get_db)):
    page = db.get(Page, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    db.delete(page)
    db.commit()
    return None


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


@router.get("/parsed/{parsed_id}", response_model=ParsedOutWithPage)
def get_parsed(parsed_id: int, db: Session = Depends(get_db)):
    parsed = db.get(Parsed, parsed_id)
    if not parsed:
        raise HTTPException(status_code=404, detail="Parsed not found")
    return ParsedOutWithPage(
        **ParsedOut.model_validate(parsed).model_dump(),
        page_title=parsed.page.title if parsed.page else None,
        page_url=parsed.page.url if parsed.page else None,
    )


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


@router.put("/parsed/{parsed_id}", response_model=ParsedOut)
def update_parsed(parsed_id: int, body: ParsedUpdate, db: Session = Depends(get_db)):
    parsed = db.get(Parsed, parsed_id)
    if not parsed:
        raise HTTPException(status_code=404, detail="Parsed not found")
    page = db.get(Page, body.page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    parsed.page_id = body.page_id
    parsed.name = body.name
    parsed.data = body.data
    parsed.info = body.info
    parsed.is_verified = body.is_verified
    db.commit()
    db.refresh(parsed)
    return parsed


@router.delete("/parsed/{parsed_id}", status_code=204)
def delete_parsed(parsed_id: int, db: Session = Depends(get_db)):
    parsed = db.get(Parsed, parsed_id)
    if not parsed:
        raise HTTPException(status_code=404, detail="Parsed not found")
    db.delete(parsed)
    db.commit()
    return None


# --- Bulk import ---
def _parsed_data_to_str(data: str | dict) -> str:
    if isinstance(data, dict):
        return json.dumps(data)
    return str(data)


@router.post("/import-bulk", response_model=ImportBulkResult)
def import_bulk(body: ImportBulkBody, db: Session = Depends(get_db)):
    result = ImportBulkResult()
    for site_item in body.sites:
        try:
            site = db.query(Site).filter(Site.url == site_item.url).first()
            if site is None:
                site = Site(name=site_item.name, url=site_item.url)
                db.add(site)
                db.commit()
                db.refresh(site)
                result.sites_created += 1
            else:
                result.sites_matched += 1
            site_id = site.id

            for page_item in site_item.pages:
                try:
                    page = db.query(Page).filter(
                        Page.site_id == site_id, Page.url == page_item.url
                    ).first()
                    if page is None:
                        page = Page(
                            title=page_item.title,
                            url=page_item.url,
                            site_id=site_id,
                        )
                        db.add(page)
                        db.commit()
                        db.refresh(page)
                        result.pages_created += 1
                    else:
                        result.pages_matched += 1
                    page_id = page.id

                    for parsed_item in page_item.parsed:
                        try:
                            data_str = _parsed_data_to_str(parsed_item.data)
                            name_val = parsed_item.name if parsed_item.name else None
                            if name_val is None:
                                existing = (
                                    db.query(Parsed)
                                    .filter(Parsed.page_id == page_id, Parsed.name.is_(None))
                                    .first()
                                )
                            else:
                                existing = (
                                    db.query(Parsed)
                                    .filter(Parsed.page_id == page_id, Parsed.name == name_val)
                                    .first()
                                )
                            if existing is not None:
                                existing.data = data_str
                                existing.info = parsed_item.info
                                existing.is_verified = parsed_item.is_verified
                                db.commit()
                                result.parsed_updated += 1
                            else:
                                rec = Parsed(
                                    page_id=page_id,
                                    name=name_val,
                                    data=data_str,
                                    info=parsed_item.info,
                                    is_verified=parsed_item.is_verified,
                                )
                                db.add(rec)
                                db.commit()
                                result.parsed_created += 1
                        except Exception as e:
                            result.errors.append(f"Parsed error: {e!s}")
                except Exception as e:
                    result.errors.append(f"Page {page_item.url!r}: {e!s}")
        except Exception as e:
            result.errors.append(f"Site {site_item.url!r}: {e!s}")
    return result
