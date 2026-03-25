"""
Artifact Catalog Service

From architecture spec (Knowledge Plane):
  - Tracks built artifacts: agent bundles, prompt packages, manifests
  - Artifact lineage: which run produced which artifact
  - Search and filtering by type, agent, version
  - S3/MinIO integration for binary artifact storage

Endpoints:
  POST /v1/artifacts                — Register a new artifact
  GET  /v1/artifacts                — List/search artifacts
  GET  /v1/artifacts/{id}           — Get artifact details + lineage
  GET  /v1/artifacts/{id}/lineage   — Full lineage trace
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[ArtifactCatalog] Starting — connecting to knowledge plane DB, MinIO")
    yield
    print("[ArtifactCatalog] Shutting down")


app = FastAPI(title="Agent Architect Pro — Artifact Catalog", version="0.1.0", lifespan=lifespan)
setup_middleware(app)

from artifact_catalog.routes import router  # noqa: E402
app.include_router(router, prefix="/v1/artifacts")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "artifact_catalog"}
