"""
Artifact Catalog — API Routes

  POST /v1/artifacts                — Register a new artifact
  GET  /v1/artifacts                — List/search artifacts
  GET  /v1/artifacts/{id}           — Get artifact details
  GET  /v1/artifacts/{id}/lineage   — Full lineage trace
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from shared.schemas.envelopes import SuccessEnvelope

router = APIRouter()


class RegisterArtifactRequest(BaseModel):
    tenant_id: str
    name: str
    artifact_type: str  # "agent_bundle" | "prompt_package" | "manifest" | "eval_report"
    agent_spec_id: str | None = None
    agent_version_id: str | None = None
    run_id: str | None = None  # The run that produced this artifact
    s3_key: str | None = None
    content_hash: str | None = None
    metadata: dict | None = None
    tags: list[str] = Field(default_factory=list)


class ArtifactResponse(BaseModel):
    artifact_id: str
    tenant_id: str
    name: str
    artifact_type: str
    agent_spec_id: str | None
    agent_version_id: str | None
    run_id: str | None
    s3_key: str | None
    content_hash: str | None
    metadata: dict | None
    tags: list[str]
    created_at: str


@router.post("/")
async def register_artifact(request: RegisterArtifactRequest):
    """Register a new artifact in the catalog."""
    artifact_id = str(uuid.uuid4())
    return SuccessEnvelope(
        data=ArtifactResponse(
            artifact_id=artifact_id,
            tenant_id=request.tenant_id,
            name=request.name,
            artifact_type=request.artifact_type,
            agent_spec_id=request.agent_spec_id,
            agent_version_id=request.agent_version_id,
            run_id=request.run_id,
            s3_key=request.s3_key,
            content_hash=request.content_hash,
            metadata=request.metadata,
            tags=request.tags,
            created_at=datetime.utcnow().isoformat(),
        ),
        meta={"action": "artifact.registered"},
    )


@router.get("/")
async def list_artifacts(
    tenant_id: str = "tenant_dev",
    artifact_type: str | None = None,
    agent_spec_id: str | None = None,
    limit: int = Query(default=50, le=200),
):
    """List/search artifacts with filtering."""
    # Mock data
    artifacts = [
        ArtifactResponse(
            artifact_id="art-001",
            tenant_id=tenant_id,
            name="Customer Support Agent v1.0 Bundle",
            artifact_type="agent_bundle",
            agent_spec_id="spec-001",
            agent_version_id="ver-001",
            run_id=None,
            s3_key="bundles/spec-001/v1.0/bundle.tar.gz",
            content_hash="sha256:abc123...",
            metadata={"size_bytes": 2048000, "components": 5},
            tags=["production", "signed"],
            created_at=datetime.utcnow().isoformat(),
        ),
        ArtifactResponse(
            artifact_id="art-002",
            tenant_id=tenant_id,
            name="Eval Report — Safety Suite v2",
            artifact_type="eval_report",
            agent_spec_id="spec-001",
            agent_version_id="ver-001",
            run_id="run-eval-001",
            s3_key="reports/eval-001/results.json",
            content_hash="sha256:def456...",
            metadata={"pass_rate": 0.95, "tests_run": 120},
            tags=["evaluation"],
            created_at=datetime.utcnow().isoformat(),
        ),
    ]
    if artifact_type:
        artifacts = [a for a in artifacts if a.artifact_type == artifact_type]

    return SuccessEnvelope(data=[a.model_dump() for a in artifacts])


@router.get("/{artifact_id}")
async def get_artifact(artifact_id: str):
    """Get artifact details."""
    return SuccessEnvelope(
        data=ArtifactResponse(
            artifact_id=artifact_id,
            tenant_id="tenant_dev",
            name="Customer Support Agent v1.0 Bundle",
            artifact_type="agent_bundle",
            agent_spec_id="spec-001",
            agent_version_id="ver-001",
            run_id=None,
            s3_key="bundles/spec-001/v1.0/bundle.tar.gz",
            content_hash="sha256:abc123...",
            metadata={"size_bytes": 2048000, "components": 5},
            tags=["production", "signed"],
            created_at=datetime.utcnow().isoformat(),
        ),
    )


@router.get("/{artifact_id}/lineage")
async def get_artifact_lineage(artifact_id: str):
    """Trace the full lineage of an artifact — what created it and what it depends on."""
    return SuccessEnvelope(
        data={
            "artifact_id": artifact_id,
            "lineage": [
                {
                    "step": 1,
                    "type": "agent_spec.created",
                    "entity_id": "spec-001",
                    "timestamp": "2026-03-20T10:00:00Z",
                    "actor": "user@example.com",
                },
                {
                    "step": 2,
                    "type": "agent_version.created",
                    "entity_id": "ver-001",
                    "timestamp": "2026-03-21T14:30:00Z",
                    "actor": "user@example.com",
                },
                {
                    "step": 3,
                    "type": "evaluation.passed",
                    "entity_id": "eval-001",
                    "timestamp": "2026-03-22T09:00:00Z",
                    "actor": "system",
                },
                {
                    "step": 4,
                    "type": "artifact.signed",
                    "entity_id": artifact_id,
                    "timestamp": "2026-03-22T09:15:00Z",
                    "actor": "kms-signer",
                },
            ],
        },
    )
