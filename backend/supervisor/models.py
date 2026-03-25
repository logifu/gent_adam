"""Supervisor SQLAlchemy models — run state persistence in PostgreSQL."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base


class RunModel(Base):
    """Persistent store for run state — the Supervisor's system of record."""

    __tablename__ = "runs"
    __table_args__ = {"schema": "control"}

    # Primary key
    run_id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: f"run_{uuid.uuid4().hex[:12]}"
    )

    # Tenant isolation
    tenant_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    actor_id: Mapped[str] = mapped_column(String(128), nullable=False)

    # Run specification
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(128), default="")
    risk_profile: Mapped[str] = mapped_column(String(32), default="standard")

    # Budget constraints
    deadline_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # State machine (7 states)
    state: Mapped[str] = mapped_column(String(32), default="planning", index=True)
    next_action: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Associated plan
    plan_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Progress tracking
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    total_tasks: Mapped[int] = mapped_column(Integer, default=0)
    completed_tasks: Mapped[int] = mapped_column(Integer, default=0)
    failed_tasks: Mapped[int] = mapped_column(Integer, default=0)

    # Inputs and outputs stored as JSON
    inputs: Mapped[dict] = mapped_column(JSONB, default=dict)
    outputs: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Error tracking
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Idempotency
    client_request_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
