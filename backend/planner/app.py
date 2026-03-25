"""Planner FastAPI application — goal to Task DAG compilation."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from shared.middleware import setup_middleware
from planner.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown hooks."""
    # TODO: Initialize Kafka consumer for run.created events
    # TODO: Initialize Kafka producer for plan.ready events
    yield


app = FastAPI(
    title="Agent Architect Pro — Planner Service",
    description="Compiles goals into budgeted Task DAGs. Compiler, not scheduler.",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

setup_middleware(app)
app.include_router(router, prefix="/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "planner"}
