"""
MongoDB connection and collections.
"""
from pymongo import MongoClient
from pymongo.database import Database

from config import MONGODB_URI, DB_NAME

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client


def get_db() -> Database:
    return get_client()[DB_NAME]


def get_users_collection():
    return get_db()["users"]


def get_sites_collection():
    return get_db()["sites"]


def get_pages_collection():
    return get_db()["pages"]


def get_parsed_collection():
    return get_db()["parsed"]
