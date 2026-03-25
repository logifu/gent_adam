"""
Release Manager — API Routes

  POST /v1/releases                  — Create a release
  GET  /v1/releases                  — List releases
  GET  /v1/releases/{id}             — Get release status
  POST /v1/releases/{id}/promote     — Promote to next environment
  POST /v1/releases/{id}/rollback    — Rollback
  POST /v1/releases/{id}/sign        — Sign release artifact (KMS)
"""

import uuid
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from shared.schemas.envelopes import SuccessEnvelope

router = APIRouter()

ENVIRONMENTS = ["development", "staging", "canary", "production"]


class CreateReleaseRequest(BaseModel):
    agent_version_id: str
    tenant_id: str
    target_environment: str = "staging"
    canary_percent: int = Field(default=5, ge=1, le=100)
    auto_promote: bool = False
    rollback_on_failure: bool = True


class PromoteRequest(BaseModel):
    target_environment: str


@router.post("/")
async def create_release(request: CreateReleaseRequest):
    """Create a new release for an agent version."""
    release_id = str(uuid.uuid4())
    return SuccessEnvelope(
        data={
            "release_id": release_id,
            "agent_version_id": request.agent_version_id,
            "tenant_id": request.tenant_id,
            "current_environment": "development",
            "target_environment": request.target_environment,
            "status": "pending_approval",
            "canary_percent": request.canary_percent,
            "rollback_on_failure": request.rollback_on_failure,
            "created_at": datetime.utcnow().isoformat(),
            "promotion_history": [],
        },
        meta={"action": "release.created"},
    )


@router.get("/")
async def list_releases(tenant_id: str = "tenant_dev"):
    """List releases for a tenant."""
    return SuccessEnvelope(
        data=[
            {
                "release_id": "rel-001",
                "agent_version_id": "ver-001",
                "current_environment": "canary",
                "status": "monitoring",
                "canary_percent": 10,
                "health_status": "healthy",
                "created_at": "2026-03-22T10:00:00Z",
            },
            {
                "release_id": "rel-002",
                "agent_version_id": "ver-002",
                "current_environment": "staging",
                "status": "evaluating",
                "canary_percent": 0,
                "health_status": "pending",
                "created_at": "2026-03-23T08:00:00Z",
            },
        ],
    )


@router.get("/{release_id}")
async def get_release(release_id: str):
    """Get release status with canary health metrics."""
    return SuccessEnvelope(
        data={
            "release_id": release_id,
            "agent_version_id": "ver-001",
            "current_environment": "canary",
            "status": "monitoring",
            "canary_percent": 10,
            "health": {
                "error_rate": 0.02,
                "latency_p95_ms": 2100,
                "safety_score": 0.95,
                "quality_score": 0.88,
                "comparison_to_baseline": {
                    "error_rate_delta": -0.005,
                    "latency_delta_ms": +150,
                    "quality_delta": +0.03,
                },
            },
            "promotion_history": [
                {"from": "development", "to": "staging", "at": "2026-03-22T10:00:00Z", "by": "auto"},
                {"from": "staging", "to": "canary", "at": "2026-03-22T14:00:00Z", "by": "operator@example.com"},
            ],
            "rollback_available": True,
        },
    )


@router.post("/{release_id}/promote")
async def promote_release(release_id: str, request: PromoteRequest):
    """Promote a release to the next environment."""
    return SuccessEnvelope(
        data={
            "release_id": release_id,
            "previous_environment": "canary",
            "new_environment": request.target_environment,
            "status": "promoting",
            "promoted_at": datetime.utcnow().isoformat(),
        },
        meta={"action": "release.promoted"},
    )


@router.post("/{release_id}/rollback")
async def rollback_release(release_id: str):
    """Rollback a release to the previous version."""
    return SuccessEnvelope(
        data={
            "release_id": release_id,
            "status": "rolling_back",
            "rollback_to_version": "ver-000",
            "reason": "manual_trigger",
            "initiated_at": datetime.utcnow().isoformat(),
        },
        meta={"action": "release.rollback_started"},
    )


@router.post("/{release_id}/sign")
async def sign_release(release_id: str):
    """Sign the release artifact with KMS-backed key."""
    return SuccessEnvelope(
        data={
            "release_id": release_id,
            "signature": "sig:sha256:KMS-signed-placeholder-" + release_id[:8],
            "signed_at": datetime.utcnow().isoformat(),
            "signer": "kms:aap-release-signing-key",
            "algorithm": "RSA-PSS-SHA256",
        },
        meta={"action": "release.signed"},
    )
