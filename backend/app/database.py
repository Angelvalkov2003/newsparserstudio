import os
from pymongo import MongoClient
from app.config import MONGO_URL, MONGO_DB_NAME

client: MongoClient | None = None

# On Windows, tlsCAFile=certifi sometimes causes TLSV1_ALERT_INTERNAL_ERROR with Atlas.
# Set USE_SYSTEM_TLS=1 in .env to connect without certifi (uses system CA store).
_USE_SYSTEM_TLS = os.getenv("USE_SYSTEM_TLS", "").strip().lower() in ("1", "true", "yes")


def _mongo_uri_uses_tls(url: str) -> bool:
    """Plain mongodb://localhost has no TLS; certifi here forces TLS and breaks local MongoDB."""
    u = (url or "").strip().lower()
    if u.startswith("mongodb+srv://"):
        return True
    if "tls=true" in u or "ssl=true" in u:
        return True
    return False


def connect_db() -> None:
    global client
    kwargs = {"serverSelectionTimeoutMS": 15000}
    if _mongo_uri_uses_tls(MONGO_URL) and not _USE_SYSTEM_TLS:
        try:
            import certifi

            kwargs["tlsCAFile"] = certifi.where()
        except Exception:
            pass
    client = MongoClient(MONGO_URL, **kwargs)
    try:
        db = client.get_database(MONGO_DB_NAME)
        db.command("ping")
    except Exception:
        pass


def close_db() -> None:
    global client
    if client:
        client.close()
        client = None


def get_db():
    if client is None:
        raise RuntimeError("MongoDB client not initialized")
    return client.get_database(MONGO_DB_NAME)


def get_collection(name: str):
    return get_db()[name]


