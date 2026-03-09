"""
App config. Set MONGODB_URI in .env (replace <db_password> with real password).
Example: mongodb+srv://angelvalkov03_db_user:YOUR_PASSWORD@universalmarkdownbuilde.w2avogu.mongodb.net/?appName=UniversalMarkdownBuilderStudioCluster
"""
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://angelvalkov03_db_user:REPLACE_PASSWORD@universalmarkdownbuilde.w2avogu.mongodb.net/?appName=UniversalMarkdownBuilderStudioCluster",
)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

DB_NAME = "universal_markdown_builder"
