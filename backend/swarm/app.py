"""
Swarm Orchestrator Service

From the architecture spec (Execution Plane):
  - Kafka consumer: task.submitted → assigns workers, creates task_attempt_id
  - Temporal activities for task dispatch and heartbeat monitoring
  - Concurrency control and backpressure management
  - Worker pool management with capacity-aware scheduling

Endpoints:
  POST /v1/swarm/dispatch         — Dispatch a task to available workers
  GET  /v1/swarm/workers          — List active workers and capacity
  GET  /v1/swarm/queue             — View pending task queue
  POST /v1/swarm/workers/{id}/drain — Drain a worker (graceful shutdown)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Swarm] Starting — connecting to Temporal, starting Kafka consumers")
    print("[Swarm] Subscribing to: task.submitted, task.completed, task.failed")
    yield
    print("[Swarm] Shutting down — draining workers")


app = FastAPI(
    title="Agent Architect Pro — Swarm Orchestrator",
    version="0.1.0",
    lifespan=lifespan,
)

setup_middleware(app)

from swarm.routes import router  # noqa: E402

app.include_router(router, prefix="/v1/swarm")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "swarm"}
