"""
Pydantic schemas for API request/response.
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_serializer


def _serialize_datetime(v: datetime | str) -> str:
    if isinstance(v, str):
        return v
    return v.isoformat()


# --- Site ---
class SiteBase(BaseModel):
    name: str
    url: str


class SiteCreate(SiteBase):
    pass


class SiteOut(SiteBase):
    id: int
    created_at: datetime | str
    updated_at: datetime | str
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at")
    def _ser_ts(self, v: datetime | str) -> str:
        return _serialize_datetime(v)


# --- Page ---
class PageBase(BaseModel):
    title: str | None = None
    url: str
    site_id: int


class PageCreate(PageBase):
    pass


class PageOut(PageBase):
    id: int
    created_at: datetime | str
    updated_at: datetime | str
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at")
    def _ser_ts(self, v: datetime | str) -> str:
        return _serialize_datetime(v)


class PageOutWithSite(PageOut):
    site_name: str | None = None


# --- Parsed ---
class ParsedBase(BaseModel):
    page_id: int
    name: str | None = None
    data: str  # JSON string (data_parsed)
    info: str | None = None
    is_verified: bool = False


class ParsedCreate(ParsedBase):
    pass


class ParsedOut(ParsedBase):
    id: int
    created_at: datetime | str
    updated_at: datetime | str
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at")
    def _ser_ts(self, v: datetime | str) -> str:
        return _serialize_datetime(v)


class ParsedOutWithPage(ParsedOut):
    page_title: str | None = None
    page_url: str | None = None
