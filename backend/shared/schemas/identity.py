"""Identity schemas — 5 canonical IDs, never a single overloaded 'agent ID'."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class IdentityType(StrEnum):
    """The 5 canonical identity types in the platform."""

    AGENT_SPEC = "agent_spec"  # Logical design family
    AGENT_VERSION = "agent_version"  # Immutable released version
    RUNTIME_INSTANCE = "runtime_instance"  # Concrete worker/container
    RUN = "run"  # One end-to-end execution
    TASK_ATTEMPT = "task_attempt"  # One execution attempt


class AgentSpec(BaseModel):
    """Logical design definition for an agent family. Long-lived until superseded."""

    agent_spec_id: str = Field(..., description="Unique identifier for the agent design family")
    name: str = Field(..., description="Human-readable agent name")
    description: str = Field("", description="Agent purpose and capabilities")
    domain: str = Field("", description="Business domain")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(..., description="Actor who created this spec")
    tenant_id: str = Field(..., description="Owning tenant")
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)


class AgentVersion(BaseModel):
    """Immutable released implementation of an agent design. Never mutated after creation."""

    agent_version_id: str = Field(..., description="Unique version identifier")
    agent_spec_id: str = Field(..., description="Parent agent spec")
    version_number: str = Field(..., description="Semantic version string")
    artifact_refs: list[str] = Field(default_factory=list, description="References to build artifacts")
    config_snapshot: dict[str, str] = Field(default_factory=dict, description="Frozen configuration")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(..., description="Release pipeline or actor")
    signature: str | None = Field(None, description="Artifact signature from Artifact Signer")
    evaluation_report_id: str | None = Field(None, description="Associated evaluation evidence")


class RuntimeInstance(BaseModel):
    """Concrete worker or container executing tasks. Short-lived, rotating."""

    runtime_instance_id: str = Field(..., description="Unique runtime worker identifier")
    agent_version_id: str = Field(..., description="Which version this worker runs")
    status: str = Field("initializing", description="Current worker status")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_heartbeat: datetime | None = Field(None, description="Last heartbeat timestamp")
    capacity: dict[str, int] = Field(default_factory=dict, description="Worker capacity report")
    node_id: str | None = Field(None, description="Kubernetes node assignment")


class TokenClaims(BaseModel):
    """Claims embedded in short-lived workload tokens."""

    sub: str = Field(..., description="Subject — runtime_instance_id or user ID")
    tenant_id: str = Field(..., description="Tenant boundary")
    roles: list[str] = Field(default_factory=list, description="RBAC roles")
    scope: list[str] = Field(default_factory=list, description="Permitted operations")
    aud: str = Field(..., description="Intended audience service")
    exp: int = Field(..., description="Expiration timestamp (Unix)")
    iat: int = Field(..., description="Issued-at timestamp (Unix)")
    jti: str = Field(..., description="Unique token ID")
