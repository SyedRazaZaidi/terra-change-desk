from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, SessionLocal, engine
from .routers import audit, auth, findings, overview, regions
from .seed import ensure_analyst_identity, ensure_haze_aoi, seed_if_empty, tiles_path


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
        ensure_haze_aoi(db)
        ensure_analyst_identity(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Terra",
    version="0.1.0",
    description="Earth observation change desk",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(overview.router)
app.include_router(regions.router)
app.include_router(findings.router)
app.include_router(audit.router)

tiles = tiles_path()
tiles.mkdir(parents=True, exist_ok=True)
app.mount("/tiles", StaticFiles(directory=str(tiles)), name="tiles")


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "terra"}
