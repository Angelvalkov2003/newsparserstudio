import certifi
from pymongo import MongoClient

from app.config import MONGO_URL, MONGO_DB_NAME

client: MongoClient | None = None


def connect_db() -> None:
    global client
    client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
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


