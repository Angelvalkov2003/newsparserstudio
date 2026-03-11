import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL") or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME") or os.getenv("MONGODB_DB_NAME", "universal_markdown_builder")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
