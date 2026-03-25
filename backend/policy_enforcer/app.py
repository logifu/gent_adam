"""
Policy Enforcer Service

From architecture spec (Trust Plane):
  - Fail-closed policy checking — if policy can't be evaluated, action is denied
  - Tool grant validation before any tool call
  - Rate limit and budget enforcement
  - Policy bundles define tenant-specific rules

Endpoints:
  POST /v1/policies/check        — Check if an action is permitted
  GET  /v1/policies/bundles       — List policy bundles for tenant
  POST /v1/policies/bundles       — Create/update a policy bundle
  POST /v1/policies/grants/check  — Validate a tool grant
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[PolicyEnforcer] Starting — loading policy bundles")
    yield
    print("[PolicyEnforcer] Shutting down")


app = FastAPI(title="Agent Architect Pro — Policy Enforcer", version="0.1.0", lifespan=lifespan)
setup_middleware(app)

from policy_enforcer.routes import router  # noqa: E402
app.include_router(router, prefix="/v1/policies")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "policy_enforcer"}
