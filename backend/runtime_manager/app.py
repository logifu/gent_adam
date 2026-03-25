"""
Runtime Manager Service

Manages worker instance lifecycle:
  - Start, stop, heartbeat, capacity reporting
  - Assigns runtime_instance_id per worker
  - K8s pod management integration (future)

Endpoints:
  POST /v1/runtime/instances         — Register a new runtime instance
  GET  /v1/runtime/instances         — List instances (filtered)
  POST /v1/runtime/instances/{id}/heartbeat — Worker heartbeat
  POST /v1/runtime/instances/{id}/stop — Stop an instance
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[RuntimeManager] Starting — connecting to control plane DB")
    yield
    print("[RuntimeManager] Shutting down")


app = FastAPI(title="Agent Architect Pro — Runtime Manager", version="0.1.0", lifespan=lifespan)
setup_middleware(app)

from runtime_manager.routes import router  # noqa: E402
app.include_router(router, prefix="/v1/runtime")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "runtime_manager"}
