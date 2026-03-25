"""
Identity Service — Agent Registry & Token Service

Manages the 5 canonical IDs from the architecture spec:
  1. agent_spec_id    — The logical agent definition
  2. agent_version_id — A specific immutable version of the definition
  3. runtime_instance_id — A running instance of a version
  4. run_id           — A single execution of a goal
  5. task_attempt_id  — One attempt at a task within a run

Endpoints:
  POST /v1/identity/agents          — Register an agent spec
  GET  /v1/identity/agents/{id}     — Get agent spec details
  POST /v1/identity/agents/{id}/versions — Create a version
  GET  /v1/identity/agents/{id}/versions — List versions
  POST /v1/identity/tokens/issue    — Issue short-lived workload JWT
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to identity DB, load signing keys
    print("[Identity] Starting — loading signing keys, connecting to registry DB")
    yield
    # Shutdown
    print("[Identity] Shutting down")


app = FastAPI(
    title="Agent Architect Pro — Identity Service",
    version="0.1.0",
    lifespan=lifespan,
)

setup_middleware(app)

# Import and mount routes
from identity.routes import router  # noqa: E402

app.include_router(router, prefix="/v1/identity")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "identity"}
