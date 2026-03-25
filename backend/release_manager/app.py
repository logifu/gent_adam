"""
Release Manager Service

From architecture spec (EP-08 — Release, Deployment & Environments):
  - Promotion pipeline: dev → staging → canary → production
  - Canary deployment with traffic splitting
  - Automated rollback on safety/quality degradation
  - Artifact signing and verification (KMS-backed)

Endpoints:
  POST /v1/releases                — Create a release
  GET  /v1/releases/{id}           — Get release status
  POST /v1/releases/{id}/promote   — Promote to next environment
  POST /v1/releases/{id}/rollback  — Rollback to previous version
  POST /v1/releases/{id}/sign      — Sign release artifact
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[ReleaseManager] Starting — connecting to Temporal for promotion workflows")
    yield
    print("[ReleaseManager] Shutting down")


app = FastAPI(title="Agent Architect Pro — Release Manager", version="0.1.0", lifespan=lifespan)
setup_middleware(app)

from release_manager.routes import router  # noqa: E402
app.include_router(router, prefix="/v1/releases")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "release_manager"}
