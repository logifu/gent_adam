"""
Identity Service — SQLAlchemy ORM Models

Tables in the `control` schema:
  - agent_specs:       Logical agent definitions (name, domain, owner)
  - agent_versions:    Immutable snapshots linked to a spec
  - runtime_instances: Running instances of a version
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from shared.database import Base


class AgentSpecModel(Base):
    """
    Logical agent definition. An agent_spec_id represents the concept
    of "a customer support agent", independent of version.
    """
    __tablename__ = "agent_specs"
    __table_args__ = {"schema": "control"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id = Column(String(64), nullable=False, index=True)
    name = Column(String(256), nullable=False)
    domain = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    owner_id = Column(String(128), nullable=False)
    tags = Column(JSONB, nullable=True, default=list)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_agent_specs_tenant_name", "tenant_id", "name"),
        {"schema": "control"},
    )


class AgentVersionModel(Base):
    """
    Immutable snapshot of an agent definition. Once created, a version
    is frozen — any change creates a new version.

    Contains the full agent configuration: brief, architecture,
    tool grants, memory config, evaluation results.
    """
    __tablename__ = "agent_versions"
    __table_args__ = {"schema": "control"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    agent_spec_id = Column(
        UUID(as_uuid=True),
        ForeignKey("control.agent_specs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_tag = Column(String(64), nullable=False)  # e.g., "v1.2.0"
    status = Column(
        Enum("draft", "evaluating", "approved", "deployed", "retired", name="version_status"),
        nullable=False,
        default="draft",
    )

    # The full agent configuration snapshot (immutable)
    brief = Column(JSONB, nullable=True)
    architecture = Column(JSONB, nullable=True)
    tool_grants = Column(JSONB, nullable=True, default=list)
    memory_config = Column(JSONB, nullable=True)
    policy_profile = Column(String(128), nullable=True)

    # Evaluation results (populated after eval phase)
    evaluation_report_id = Column(UUID(as_uuid=True), nullable=True)
    artifact_hash = Column(String(128), nullable=True)  # SHA-256 of frozen config

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(String(128), nullable=False)

    __table_args__ = (
        Index("ix_agent_versions_spec_tag", "agent_spec_id", "version_tag", unique=True),
        {"schema": "control"},
    )


class RuntimeInstanceModel(Base):
    """
    A running instance of a specific agent version.
    Tracks lifecycle state, resource allocation, and health.
    """
    __tablename__ = "runtime_instances"
    __table_args__ = {"schema": "control"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    agent_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("control.agent_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(String(64), nullable=False, index=True)
    environment = Column(
        Enum("development", "staging", "canary", "production", name="environment_type"),
        nullable=False,
        default="development",
    )
    status = Column(
        Enum("starting", "running", "draining", "stopped", "failed", name="instance_status"),
        nullable=False,
        default="starting",
    )

    # Resource allocation
    node_id = Column(String(256), nullable=True)  # K8s node
    pod_name = Column(String(256), nullable=True)
    resource_profile = Column(JSONB, nullable=True)  # CPU, memory, GPU

    # Health tracking
    last_heartbeat = Column(DateTime, nullable=True)
    total_runs_executed = Column(String(32), default="0")
    error_count = Column(String(32), default="0")

    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    stopped_at = Column(DateTime, nullable=True)
