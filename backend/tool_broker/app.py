"""Tool Broker FastAPI application — mediated external tool access."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from shared.middleware import setup_middleware
from tool_broker.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize Vault connection and audit hooks."""
    # TODO: Initialize Vault SDK for credential brokering
    # TODO: Initialize Kafka producer for audit events
    yield


app = FastAPI(
    title="Agent Architect Pro — Tool Broker",
    description="Mediated tool execution. Choke point for ALL external actions.",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

setup_middleware(app)
app.include_router(router, prefix="/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "tool-broker"}
