"""Retrieval Service FastAPI application — semantic knowledge search."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from shared.middleware import setup_middleware
from retrieval.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize pgvector connection and reranker model."""
    # TODO: Initialize pgvector index
    # TODO: Load reranker model
    yield


app = FastAPI(
    title="Agent Architect Pro — Retrieval Service",
    description="Semantic search over knowledge, episodes, and artifacts using pgvector.",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

setup_middleware(app)
app.include_router(router, prefix="/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "retrieval"}
