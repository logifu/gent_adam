"""
Evaluation Service

From architecture spec (EP-07 — Evaluation & Simulation):
  - Benchmarks: quality scoring, accuracy tests, latency tests
  - Safety checks: toxicity, bias, hallucination detection
  - Simulation: synthetic scenario execution
  - Replay: historical traffic replay with comparison

Endpoints:
  POST /v1/eval/suites             — Define an evaluation suite
  POST /v1/eval/runs               — Trigger an evaluation run
  GET  /v1/eval/runs/{id}          — Get evaluation results
  GET  /v1/eval/suites             — List available evaluation suites
  POST /v1/eval/simulate           — Run synthetic simulation
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Evaluation] Starting — loading benchmark suites, safety models")
    yield
    print("[Evaluation] Shutting down")


app = FastAPI(title="Agent Architect Pro — Evaluation Service", version="0.1.0", lifespan=lifespan)
setup_middleware(app)

from evaluation.routes import router  # noqa: E402
app.include_router(router, prefix="/v1/eval")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "evaluation"}
