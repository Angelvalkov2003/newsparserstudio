"""
Pydantic schemas for API (MongoDB + auth). IDs are strings (ObjectId hex).
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str


class UserPublic(BaseModel):
    id: str
    username: str
    role: str  # guest | admin | regular
    is_verified_by_admin: bool = False
    is_guest: bool = False


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# --- User (admin CRUD) ---
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "regular"  # admin | regular (guest is created via /auth/guest)


class UserUpdate(BaseModel):
    role: str | None = None
    is_verified_by_admin: bool | None = None


# --- Site ---
class SiteBase(BaseModel):
    name: str
    url: str


class SiteCreate(SiteBase):
    pass


class SiteUpdate(SiteBase):
    pass


class SiteOut(SiteBase):
    id: str
    created_by: str | None = None
    allowed_for: list[str] = []
    created_at: str
    updated_at: str
    model_config = ConfigDict(from_attributes=True)


class SiteAllowedForUpdate(BaseModel):
    allowed_for: list[str]


# --- Page ---
class PageBase(BaseModel):
    title: str | None = None
    url: str
    site_id: str


class PageCreate(PageBase):
    pass


class PageUpdate(PageBase):
    pass


class PageOut(PageBase):
    id: str
    created_by: str | None = None
    allowed_for: list[str] = []
    created_at: str
    updated_at: str
    model_config = ConfigDict(from_attributes=True)


class PageOutWithSite(PageOut):
    site_name: str | None = None


class PageAllowedForUpdate(BaseModel):
    allowed_for: list[str]


# --- Parsed ---
class ParsedBase(BaseModel):
    page_id: str
    name: str | None = None
    data: str
    info: str | None = None
    is_verified: bool = False


class ParsedCreate(ParsedBase):
    pass


class ParsedUpdate(ParsedBase):
    pass


class ParsedOut(ParsedBase):
    id: str
    created_by: str | None = None
    allowed_for: list[str] = []
    created_at: str
    updated_at: str
    model_config = ConfigDict(from_attributes=True)


class ParsedOutWithPage(ParsedOut):
    page_title: str | None = None
    page_url: str | None = None


class ParsedAllowedForUpdate(BaseModel):
    allowed_for: list[str]


# --- Bulk import ---
class ParsedBulkItem(BaseModel):
    name: str | None = None
    data: str | dict
    info: str | None = None
    is_verified: bool = False


class PageBulkItem(BaseModel):
    title: str | None = None
    url: str
    parsed: list[ParsedBulkItem] = []


class SiteBulkItem(BaseModel):
    name: str
    url: str
    pages: list[PageBulkItem] = []


class ImportBulkBody(BaseModel):
    sites: list[SiteBulkItem] = []


class ImportBulkResult(BaseModel):
    sites_created: int = 0
    sites_matched: int = 0
    pages_created: int = 0
    pages_matched: int = 0
    parsed_created: int = 0
    parsed_updated: int = 0
    errors: list[str] = []
