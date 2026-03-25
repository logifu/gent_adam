"""Supervisor FastAPI application — run lifecycle management."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from shared.middleware import setup_middleware
from supervisor.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown hooks."""
    # TODO: Initialize Temporal client connection
    # TODO: Initialize Kafka producer
    # TODO: Run Alembic migrations (dev mode)
    yield
    # TODO: Cleanup connections


app = FastAPI(
    title="Agent Architect Pro — Supervisor Service",
    description="Run lifecycle management. Creates, tracks, and orchestrates governed agent runs.",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

# Register shared middleware (tracing, error handling, correlation)
setup_middleware(app)

# Register routes
app.include_router(router, prefix="/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for Kubernetes liveness probe."""
    return {"status": "healthy", "service": "supervisor"}
