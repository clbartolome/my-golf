from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.bag_router import router as bag_router
from app.routers import router as rounds_router
from app.stats_router import router as stats_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rounds_router)
app.include_router(stats_router)
app.include_router(bag_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
