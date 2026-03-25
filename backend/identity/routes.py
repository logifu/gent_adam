"""
Identity Service — API Routes

Implements the Identity Registry and Token Service endpoints:
  POST /v1/identity/agents              — Register agent spec
  GET  /v1/identity/agents              — List agent specs (tenant-filtered)
  GET  /v1/identity/agents/{id}         — Get agent spec detail
  POST /v1/identity/agents/{id}/versions — Create new version
  GET  /v1/identity/agents/{id}/versions — List versions for spec
  GET  /v1/identity/versions/{id}       — Get version detail
  POST /v1/identity/tokens/issue        — Issue short-lived workload token
"""

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_session
from shared.schemas.envelopes import ErrorCode, ErrorEnvelope, SuccessEnvelope
from identity.models import AgentSpecModel, AgentVersionModel

router = APIRouter()


# ── Request / Response Models ────────────────────────────

class CreateAgentSpecRequest(BaseModel):
    tenant_id: str
    name: str
    domain: str | None = None
    description: str | None = None
    owner_id: str
    tags: list[str] = Field(default_factory=list)


class CreateVersionRequest(BaseModel):
    created_by: str
    version_tag: str  # e.g., "v1.0.0"
    brief: dict | None = None
    architecture: dict | None = None
    tool_grants: list[dict] = Field(default_factory=list)
    memory_config: dict | None = None
    policy_profile: str | None = None


class IssueTokenRequest(BaseModel):
    agent_version_id: str
    runtime_instance_id: str
    scopes: list[str] = Field(default_factory=lambda: ["run:execute", "tools:call", "retrieve:search"])
    ttl_minutes: int = Field(default=15, ge=1, le=60)


class AgentSpecResponse(BaseModel):
    agent_spec_id: str
    tenant_id: str
    name: str
    domain: str | None
    description: str | None
    owner_id: str
    tags: list[str]
    created_at: str
    version_count: int


class VersionResponse(BaseModel):
    agent_version_id: str
    agent_spec_id: str
    version_tag: str
    status: str
    brief: dict | None
    architecture: dict | None
    tool_grants: list
    policy_profile: str | None
    artifact_hash: str | None
    created_at: str
    created_by: str


class WorkloadToken(BaseModel):
    token: str
    token_type: str = "Bearer"
    expires_at: str
    scopes: list[str]
    subject: str


# ── Agent Spec Endpoints ─────────────────────────────────

@router.post("/agents")
async def register_agent_spec(
    request: CreateAgentSpecRequest,
    session: AsyncSession = Depends(get_session),
):
    """Register a new agent specification."""
    agent = AgentSpecModel(
        tenant_id=request.tenant_id,
        name=request.name,
        domain=request.domain,
        description=request.description,
        owner_id=request.owner_id,
        tags=request.tags,
    )
    session.add(agent)
    await session.flush()

    return SuccessEnvelope(
        data=AgentSpecResponse(
            agent_spec_id=str(agent.id),
            tenant_id=agent.tenant_id,
            name=agent.name,
            domain=agent.domain,
            description=agent.description,
            owner_id=agent.owner_id,
            tags=agent.tags or [],
            created_at=agent.created_at.isoformat() if agent.created_at else datetime.utcnow().isoformat(),
            version_count=0,
        ),
        meta={"action": "agent_spec.created"},
    )


@router.get("/agents")
async def list_agent_specs(
    tenant_id: str,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
):
    """List all agent specs for a tenant."""
    query = (
        select(AgentSpecModel)
        .where(AgentSpecModel.tenant_id == tenant_id)
        .order_by(AgentSpecModel.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(query)
    agents = result.scalars().all()

    return SuccessEnvelope(
        data=[
            AgentSpecResponse(
                agent_spec_id=str(a.id),
                tenant_id=a.tenant_id,
                name=a.name,
                domain=a.domain,
                description=a.description,
                owner_id=a.owner_id,
                tags=a.tags or [],
                created_at=a.created_at.isoformat(),
                version_count=0,  # TODO: count versions
            )
            for a in agents
        ],
        meta={"total": str(len(agents))},
    )


@router.get("/agents/{agent_spec_id}")
async def get_agent_spec(
    agent_spec_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get a specific agent spec by ID."""
    query = select(AgentSpecModel).where(
        AgentSpecModel.id == uuid.UUID(agent_spec_id)
    )
    result = await session.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=404,
            detail=ErrorEnvelope(
                error={"code": ErrorCode.NOT_FOUND, "message": "Agent spec not found"},
            ).model_dump(),
        )

    return SuccessEnvelope(
        data=AgentSpecResponse(
            agent_spec_id=str(agent.id),
            tenant_id=agent.tenant_id,
            name=agent.name,
            domain=agent.domain,
            description=agent.description,
            owner_id=agent.owner_id,
            tags=agent.tags or [],
            created_at=agent.created_at.isoformat(),
            version_count=0,
        ),
    )


# ── Version Endpoints ────────────────────────────────────

@router.post("/agents/{agent_spec_id}/versions")
async def create_version(
    agent_spec_id: str,
    request: CreateVersionRequest,
    session: AsyncSession = Depends(get_session),
):
    """Create a new immutable version for an agent spec."""
    # Verify the spec exists
    spec_query = select(AgentSpecModel).where(
        AgentSpecModel.id == uuid.UUID(agent_spec_id)
    )
    result = await session.execute(spec_query)
    spec = result.scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Agent spec not found")

    # Check for duplicate version tag
    dup_query = select(AgentVersionModel).where(
        AgentVersionModel.agent_spec_id == uuid.UUID(agent_spec_id),
        AgentVersionModel.version_tag == request.version_tag,
    )
    dup_result = await session.execute(dup_query)
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Version tag '{request.version_tag}' already exists for this agent",
        )

    version = AgentVersionModel(
        agent_spec_id=uuid.UUID(agent_spec_id),
        version_tag=request.version_tag,
        status="draft",
        brief=request.brief,
        architecture=request.architecture,
        tool_grants=request.tool_grants,
        memory_config=request.memory_config,
        policy_profile=request.policy_profile,
        created_by=request.created_by,
    )
    session.add(version)
    await session.flush()

    return SuccessEnvelope(
        data=VersionResponse(
            agent_version_id=str(version.id),
            agent_spec_id=str(version.agent_spec_id),
            version_tag=version.version_tag,
            status=version.status,
            brief=version.brief,
            architecture=version.architecture,
            tool_grants=version.tool_grants or [],
            policy_profile=version.policy_profile,
            artifact_hash=version.artifact_hash,
            created_at=version.created_at.isoformat() if version.created_at else datetime.utcnow().isoformat(),
            created_by=version.created_by,
        ),
        meta={"action": "agent_version.created"},
    )


@router.get("/agents/{agent_spec_id}/versions")
async def list_versions(
    agent_spec_id: str,
    session: AsyncSession = Depends(get_session),
):
    """List all versions of an agent spec."""
    query = (
        select(AgentVersionModel)
        .where(AgentVersionModel.agent_spec_id == uuid.UUID(agent_spec_id))
        .order_by(AgentVersionModel.created_at.desc())
    )
    result = await session.execute(query)
    versions = result.scalars().all()

    return SuccessEnvelope(
        data=[
            VersionResponse(
                agent_version_id=str(v.id),
                agent_spec_id=str(v.agent_spec_id),
                version_tag=v.version_tag,
                status=v.status,
                brief=v.brief,
                architecture=v.architecture,
                tool_grants=v.tool_grants or [],
                policy_profile=v.policy_profile,
                artifact_hash=v.artifact_hash,
                created_at=v.created_at.isoformat(),
                created_by=v.created_by,
            )
            for v in versions
        ],
    )


# ── Token Service ────────────────────────────────────────

@router.post("/tokens/issue")
async def issue_workload_token(request: IssueTokenRequest):
    """
    Issue a short-lived workload JWT for a runtime instance.

    In production, this will:
    1. Verify the runtime_instance is active and healthy
    2. Check tenant policy for allowed scopes
    3. Sign with KMS-backed private key
    4. Record issuance in audit log
    """
    # TODO: Replace with real JWT signing (PyJWT + KMS)
    expires_at = datetime.utcnow() + timedelta(minutes=request.ttl_minutes)

    # Stub token — in production this would be a real JWT
    token_payload = {
        "sub": request.runtime_instance_id,
        "aud": "agent-architect-pro",
        "agent_version_id": request.agent_version_id,
        "scopes": request.scopes,
        "iat": int(datetime.utcnow().timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    # Placeholder: encode as a simple base64 string
    import base64
    import json
    stub_token = base64.urlsafe_b64encode(
        json.dumps(token_payload).encode()
    ).decode()

    return SuccessEnvelope(
        data=WorkloadToken(
            token=f"aap.{stub_token}",
            token_type="Bearer",
            expires_at=expires_at.isoformat(),
            scopes=request.scopes,
            subject=request.runtime_instance_id,
        ),
        meta={"action": "workload_token.issued"},
    )
