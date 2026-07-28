from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_router
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.schemas.health import HealthResponse
from app.services.seed import seed_cocktails


def create_app(*, seed_on_startup: bool = True) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        if seed_on_startup:
            Base.metadata.create_all(engine)
            with SessionLocal() as db:
                seed_cocktails(db)
        yield

    app = FastAPI(
        title="Twilight Cocktail API",
        description="Prototype API skeleton for 暮色酒单.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok", service="twilight-cocktail-api")

    return app


app = create_app()
