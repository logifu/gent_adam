"""Initial schema — runs, agent_specs, agent_versions, runtime_instances, audit_events

Revision ID: 001_initial
Revises: None
Create Date: 2026-03-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Control Plane Tables ─────────────────────────────

    # Runs table (Supervisor)
    op.create_table(
        "runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.String(64), nullable=False, index=True),
        sa.Column("objective", sa.Text, nullable=False),
        sa.Column("state", sa.String(32), nullable=False, server_default="planning"),
        sa.Column("plan_id", UUID(as_uuid=True), nullable=True),
        sa.Column("initiator_id", sa.String(128), nullable=False),
        sa.Column("agent_spec_id", UUID(as_uuid=True), nullable=True),
        sa.Column("agent_version_id", UUID(as_uuid=True), nullable=True),
        sa.Column("policy_profile", sa.String(128), nullable=True),
        sa.Column("client_request_id", sa.String(256), nullable=True),
        sa.Column("budget_max_usd", sa.Numeric(10, 4), nullable=True),
        sa.Column("budget_max_tokens", sa.Integer, nullable=True),
        sa.Column("budget_max_wall_seconds", sa.Integer, nullable=True),
        sa.Column("cost_usd", sa.Numeric(10, 4), nullable=True, server_default="0"),
        sa.Column("tokens_used", sa.Integer, nullable=True, server_default="0"),
        sa.Column("constraints", JSONB, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("next_action", sa.String(256), nullable=True),
        sa.Column("milestones", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        schema="control",
    )
    op.create_index("ix_runs_client_request_id", "runs", ["client_request_id"], schema="control")
    op.create_index("ix_runs_state", "runs", ["state"], schema="control")

    # Agent Specs table (Identity)
    op.create_table(
        "agent_specs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.String(64), nullable=False, index=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("domain", sa.String(128), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("owner_id", sa.String(128), nullable=False),
        sa.Column("tags", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        schema="control",
    )
    op.create_index("ix_agent_specs_tenant_name", "agent_specs", ["tenant_id", "name"], schema="control")

    # Agent Versions table (Identity)
    op.create_table(
        "agent_versions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("agent_spec_id", UUID(as_uuid=True), sa.ForeignKey("control.agent_specs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("version_tag", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("brief", JSONB, nullable=True),
        sa.Column("architecture", JSONB, nullable=True),
        sa.Column("tool_grants", JSONB, nullable=True),
        sa.Column("memory_config", JSONB, nullable=True),
        sa.Column("policy_profile", sa.String(128), nullable=True),
        sa.Column("evaluation_report_id", UUID(as_uuid=True), nullable=True),
        sa.Column("artifact_hash", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("created_by", sa.String(128), nullable=False),
        schema="control",
    )
    op.create_index("ix_agent_versions_spec_tag", "agent_versions", ["agent_spec_id", "version_tag"], unique=True, schema="control")

    # Runtime Instances table (Identity)
    op.create_table(
        "runtime_instances",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("agent_version_id", UUID(as_uuid=True), sa.ForeignKey("control.agent_versions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, index=True),
        sa.Column("environment", sa.String(32), nullable=False, server_default="development"),
        sa.Column("status", sa.String(32), nullable=False, server_default="starting"),
        sa.Column("node_id", sa.String(256), nullable=True),
        sa.Column("pod_name", sa.String(256), nullable=True),
        sa.Column("resource_profile", JSONB, nullable=True),
        sa.Column("last_heartbeat", sa.DateTime, nullable=True),
        sa.Column("total_runs_executed", sa.Integer, nullable=True, server_default="0"),
        sa.Column("error_count", sa.Integer, nullable=True, server_default="0"),
        sa.Column("started_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("stopped_at", sa.DateTime, nullable=True),
        schema="control",
    )

    # ── Execution Plane Tables ───────────────────────────

    # Plans table
    op.create_table(
        "plans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("run_id", UUID(as_uuid=True), sa.ForeignKey("control.runs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tenant_id", sa.String(64), nullable=False),
        sa.Column("goal", sa.Text, nullable=False),
        sa.Column("strategy", sa.String(64), nullable=True),
        sa.Column("tasks", JSONB, nullable=False),
        sa.Column("dependencies", JSONB, nullable=True),
        sa.Column("budget", JSONB, nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        schema="execution",
    )

    # Task Attempts table
    op.create_table(
        "task_attempts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("plan_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("task_id", sa.String(128), nullable=False),
        sa.Column("run_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("tenant_id", sa.String(64), nullable=False),
        sa.Column("attempt_number", sa.Integer, nullable=False, server_default="1"),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("worker_id", sa.String(128), nullable=True),
        sa.Column("input_payload", JSONB, nullable=True),
        sa.Column("output_payload", JSONB, nullable=True),
        sa.Column("error_info", JSONB, nullable=True),
        sa.Column("tokens_used", sa.Integer, nullable=True, server_default="0"),
        sa.Column("cost_usd", sa.Numeric(10, 4), nullable=True, server_default="0"),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        schema="execution",
    )

    # ── Trust Plane Tables ───────────────────────────────

    # Audit Events (append-only, hash-chained)
    op.create_table(
        "audit_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sequence_number", sa.BigInteger, nullable=False, autoincrement=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, index=True),
        sa.Column("run_id", UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("task_attempt_id", UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(128), nullable=False, index=True),
        sa.Column("actor_id", sa.String(128), nullable=False),
        sa.Column("service", sa.String(64), nullable=False),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=True),
        sa.Column("resource_id", sa.String(256), nullable=True),
        sa.Column("payload", JSONB, nullable=True),
        sa.Column("previous_hash", sa.String(128), nullable=True),
        sa.Column("event_hash", sa.String(128), nullable=False),
        sa.Column("timestamp", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        schema="trust",
    )
    op.create_index("ix_audit_events_sequence", "audit_events", ["sequence_number"], unique=True, schema="trust")

    # Policy Bundles
    op.create_table(
        "policy_bundles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.String(64), nullable=False, index=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("rules", JSONB, nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        schema="trust",
    )

    # Tool Grants
    op.create_table(
        "tool_grants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.String(64), nullable=False, index=True),
        sa.Column("agent_version_id", UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("tool_name", sa.String(128), nullable=False),
        sa.Column("permissions", JSONB, nullable=False),
        sa.Column("rate_limit", sa.Integer, nullable=True),
        sa.Column("expires_at", sa.DateTime, nullable=True),
        sa.Column("granted_by", sa.String(128), nullable=False),
        sa.Column("revoked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        schema="trust",
    )

    # ── Knowledge Plane Tables ───────────────────────────

    # Knowledge Documents (for pgvector search)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "knowledge_documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.String(64), nullable=False, index=True),
        sa.Column("source_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("content_hash", sa.String(128), nullable=False),
        sa.Column("metadata", JSONB, nullable=True),
        sa.Column("tags", JSONB, nullable=True),
        sa.Column("s3_key", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        schema="knowledge",
    )

    # Knowledge Embeddings (pgvector)
    op.create_table(
        "knowledge_embeddings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("document_id", UUID(as_uuid=True), sa.ForeignKey("knowledge.knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("chunk_text", sa.Text, nullable=False),
        sa.Column("model_name", sa.String(128), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        schema="knowledge",
    )
    # Add the vector column separately (1536 dimensions for OpenAI ada-002)
    op.execute("ALTER TABLE knowledge.knowledge_embeddings ADD COLUMN embedding vector(1536)")
    op.execute("CREATE INDEX ix_knowledge_embeddings_vector ON knowledge.knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")


def downgrade() -> None:
    # Knowledge Plane
    op.drop_table("knowledge_embeddings", schema="knowledge")
    op.drop_table("knowledge_documents", schema="knowledge")

    # Trust Plane
    op.drop_table("tool_grants", schema="trust")
    op.drop_table("policy_bundles", schema="trust")
    op.drop_table("audit_events", schema="trust")

    # Execution Plane
    op.drop_table("task_attempts", schema="execution")
    op.drop_table("plans", schema="execution")

    # Control Plane
    op.drop_table("runtime_instances", schema="control")
    op.drop_table("agent_versions", schema="control")
    op.drop_table("agent_specs", schema="control")
    op.drop_table("runs", schema="control")
