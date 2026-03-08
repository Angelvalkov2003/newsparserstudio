"""
FastAPI backend - JSON-based workflow with SQLite.
Accepts JSON upload, returns JSON, returns edited JSON for download.
"""
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables
from routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Universal Markdown Builder Studio API",
    description="JSON upload/download and responses. SQLite persistence.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Health / root endpoint."""
    return {"status": "ok", "message": "Universal Markdown Builder Studio API"}


@app.get("/health")
def health():
    """Health check for local development."""
    return {"status": "healthy"}


@app.exception_handler(Exception)
def catch_all(_request, exc: Exception):
    """Log unhandled errors so 500 responses show cause in server console."""
    traceback.print_exc()
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )
