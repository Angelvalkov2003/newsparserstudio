"""
FastAPI backend - MongoDB + JWT auth. Sites, pages, parsed with visibility (creator / allowed_for / admin).
"""
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes_auth import router as auth_router
from routes_users import router as users_router
from routes_mongo import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Test MongoDB connection at startup (so we see auth errors immediately)
    from config import MONGODB_URI, DB_NAME
    # Parse user@host (no password) for logging
    if "@" in MONGODB_URI:
        right = MONGODB_URI.split("@", 1)[1]
        host = right.split("/")[0].split("?")[0]
        user = MONGODB_URI.split("://", 1)[1].split(":")[0] if "://" in MONGODB_URI else "?"
    else:
        host = user = "?"
    try:
        from mongodb import get_client
        client = get_client()
        client.admin.command("ping")
        client[DB_NAME].get_collection("users").find_one()
        print(f"[MongoDB] OK connected as {user} @ {host}")
    except Exception as e:
        print(f"[MongoDB] FAILED {user} @ {host}: {e}")
    yield


app = FastAPI(
    title="Universal Markdown Builder Studio API",
    description="MongoDB persistence, JWT auth, roles (guest/admin/regular), visibility.",
    version="0.2.0",
    lifespan=lifespan,
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "Universal Markdown Builder Studio API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.exception_handler(Exception)
def catch_all(_request, exc: Exception):
    traceback.print_exc()
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )
