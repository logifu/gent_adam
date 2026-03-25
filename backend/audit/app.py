"""
Audit Ledger Service — Append-Only Hash-Chained Event Store

Architecture Decision D7: Every model inference, tool call, plan mutation,
and user action is recorded as an immutable, hash-chained audit event.

Design:
  - SHA-256(previous_hash + payload + timestamp) ensures chain integrity
  - Events are append-only — no updates or deletes
  - Kafka consumer ingests audit.event topic in real time
  - Periodic integrity verification job

Endpoints:
  GET  /v1/audit/runs/{run_id}          — Get audit trail for a run
  GET  /v1/audit/events                 — Query audit events (filtered)
  POST /v1/audit/verify                 — Verify chain integrity
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to audit DB, start Kafka consumer for audit.event topic
    print("[Audit] Starting — connecting to trust plane database")
    print("[Audit] Starting Kafka consumer for 'audit.event' topic")
    yield
    print("[Audit] Shutting down — closing Kafka consumer")


app = FastAPI(
    title="Agent Architect Pro — Audit Ledger Service",
    version="0.1.0",
    lifespan=lifespan,
)

setup_middleware(app)

from audit.routes import router  # noqa: E402

app.include_router(router, prefix="/v1/audit")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "audit"}
