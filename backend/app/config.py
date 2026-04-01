import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL") or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME") or os.getenv("MONGODB_DB_NAME", "universal_markdown_builder")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")

# Optional SQL->Mongo sync configuration
SQL_SYNC_ENABLED = os.getenv("SQL_SYNC_ENABLED", "true").lower() in ("1", "true", "yes")
SQL_SYNC_HOST = os.getenv("DB_HOST", "localhost")
SQL_SYNC_PORT = int(os.getenv("DB_PORT", "3306"))
SQL_SYNC_DB = os.getenv("DB_NAME", "tpf2")
SQL_SYNC_USER = os.getenv("DB_USER", "")
SQL_SYNC_PASS = os.getenv("DB_PASS", "")
SQL_SYNC_BATCH_SIZE = int(os.getenv("SQL_SYNC_BATCH_SIZE", "200"))
