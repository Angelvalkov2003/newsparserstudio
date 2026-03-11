"""
App config. Add env vars here when you set up the new database.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

# MongoDB Atlas
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "universal_markdown_builder")

# JWT for auth (optional)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
