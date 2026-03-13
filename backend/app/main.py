import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import ServerSelectionTimeoutError

from fastapi import APIRouter

from app.config import MONGO_URL
from app.database import connect_db, close_db
from app.routes.auth import router as auth_router
from app.routes.app_users import router as app_users_router
from app.routes.sites import router as sites_router
from app.routes.pages import router as pages_router
from app.routes.parsed import router as parsed_router
from app.routes.import_bulk import router as import_bulk_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    if MONGO_URL:
        try:
            connect_db()
        except Exception as e:
            import sys
            print(f"Warning: MongoDB connection failed at startup: {e}", file=sys.stderr)
    yield
    close_db()


app = FastAPI(
    title="Universal Markdown Builder Studio API",
    version="0.4.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(app_users_router)
api_router.include_router(sites_router)
api_router.include_router(pages_router)
api_router.include_router(parsed_router)
api_router.include_router(import_bulk_router)
app.include_router(api_router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Universal Markdown Builder Studio API"}


@api_router.get("/health")
def health():
    """If you see special_routes: true, the backend serves /api/pages/special/guest and /special/unique."""
    return {
        "status": "ok",
        "version": "0.4.0",
        "special_routes": True,
    }


@app.exception_handler(ServerSelectionTimeoutError)
def mongo_unreachable(_request, exc: ServerSelectionTimeoutError):
    traceback.print_exc()
    return JSONResponse(
        status_code=503,
        content={
            "detail": "MongoDB unreachable (SSL or network). Try: 1) Atlas Network Access – add your IP; 2) In .env add USE_SYSTEM_TLS=1 and restart backend; 3) Turn VPN off.",
        },
    )


@app.exception_handler(Exception)
def catch_all(_request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
