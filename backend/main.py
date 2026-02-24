"""
FastAPI backend - JSON-based workflow, no database.
Accepts JSON upload, returns JSON, returns edited JSON for download.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="NewsParserStudio API",
    description="JSON upload/download and responses. No auth, no persistence.",
    version="0.1.0",
)

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
    return {"status": "ok", "message": "NewsParserStudio API"}


@app.get("/health")
def health():
    """Health check for local development."""
    return {"status": "healthy"}
