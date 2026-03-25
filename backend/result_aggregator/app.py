"""
Result Aggregator Service

From architecture spec (Execution Plane):
  - Kafka consumer: task.completed → normalized output to Supervisor
  - Aggregates multi-task results into unified run output
  - Handles partial failures and result merging

Endpoints:
  POST /v1/results/aggregate      — Aggregate task results for a run
  GET  /v1/results/runs/{run_id}  — Get aggregated result for a run
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[ResultAggregator] Starting — subscribing to task.completed events")
    yield
    print("[ResultAggregator] Shutting down")


app = FastAPI(title="Agent Architect Pro — Result Aggregator", version="0.1.0", lifespan=lifespan)
setup_middleware(app)

from result_aggregator.routes import router  # noqa: E402
app.include_router(router, prefix="/v1/results")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "result_aggregator"}
