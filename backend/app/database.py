import os
from pymongo import MongoClient
from app.config import MONGO_URL, MONGO_DB_NAME

client: MongoClient | None = None

# On Windows, tlsCAFile=certifi sometimes causes TLSV1_ALERT_INTERNAL_ERROR with Atlas.
# Set USE_SYSTEM_TLS=1 in .env to connect without certifi (uses system CA store).
_USE_SYSTEM_TLS = os.getenv("USE_SYSTEM_TLS", "").strip().lower() in ("1", "true", "yes")


def connect_db() -> None:
    global client
    kwargs = {"serverSelectionTimeoutMS": 15000}
    if not _USE_SYSTEM_TLS:
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


