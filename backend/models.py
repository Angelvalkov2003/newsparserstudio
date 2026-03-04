"""
SQLAlchemy models: site, page, parsed.
All tables have id, created_at, updated_at.
"""
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


def _timestamp_default():
    return datetime.utcnow()


class Site(Base):
    __tablename__ = "site"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    pages: Mapped[list["Page"]] = relationship("Page", back_populates="site")


class Page(Base):
    __tablename__ = "page"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    site_id: Mapped[int] = mapped_column(ForeignKey("site.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    site: Mapped["Site"] = relationship("Site", back_populates="pages")
    parsed_records: Mapped[list["Parsed"]] = relationship("Parsed", back_populates="page")


class Parsed(Base):
    __tablename__ = "parsed"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    page_id: Mapped[int] = mapped_column(ForeignKey("page.id"), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON as data_parsed
    info: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    page: Mapped["Page"] = relationship("Page", back_populates="parsed_records")
