"""Model Gateway FastAPI application — the second choke point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from shared.middleware import setup_middleware
from model_gateway.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize model provider connections."""
    # TODO: Initialize provider adapters (OpenAI, Anthropic, local)
    # TODO: Initialize quota tracking
    yield


app = FastAPI(
    title="Agent Architect Pro — Model Gateway",
    description="Provider-abstracted model inference. Choke point for ALL LLM calls.",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

setup_middleware(app)
app.include_router(router, prefix="/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "model-gateway"}
