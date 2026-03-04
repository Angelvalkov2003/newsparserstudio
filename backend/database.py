"""
SQLite database: engine, session factory, table creation.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from models import Base

# Database file next to backend folder
DB_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_URL = f"sqlite:///{os.path.join(DB_DIR, 'newsparserstudio.db')}"

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables():
    """Create all tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """Dependency: yield a DB session and close after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
