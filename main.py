import os
from contextlib import asynccontextmanager

import certifi
from fastapi import FastAPI
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")

DB_NAME = "newsparserstudio"

client: MongoClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
    try:
        db = client.get_database(DB_NAME)
        db.demo.insert_one({
            "message": "News Parser Studio first record",
            "source": "FastAPI backend",
            "created": "2026-03-11",
        })
    except Exception:
        pass
    yield
    if client:
        client.close()


app = FastAPI(title="News Parser Studio", lifespan=lifespan)


def get_db():
    if client is None:
        raise RuntimeError("MongoDB client not initialized")
    return client.get_database(DB_NAME)


@app.get("/")
async def root():
    return {"message": "News Parser Studio backend", "mongodb": "connected"}


@app.get("/health")
async def health():
    db = get_db()
    try:
        db.command("ping")
        return {"status": "ok", "mongodb": "connected"}
    except Exception as e:
        return {"status": "error", "mongodb": str(e)}


@app.get("/collections")
async def list_collections():
    db = get_db()
    return {"collections": db.list_collection_names()}


@app.post("/demo")
async def create_demo_record(message: str = "New record from API"):
    db = get_db()
    result = db.demo.insert_one({"message": message, "source": "API"})
    return {"id": str(result.inserted_id), "message": message}


@app.get("/demo")
async def list_demo_records():
    db = get_db()
    docs = list(db.demo.find())
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"items": docs}
