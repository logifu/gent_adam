"""Run schemas — the Supervisor's domain. 7-state lifecycle machine."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class RunState(StrEnum):
    """7 states in the run lifecycle — maps to Temporal workflow states."""

    PLANNING = "planning"
    QUEUED = "queued"
    RUNNING = "running"
    AWAITING_REVIEW = "awaiting_review"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RiskProfile(StrEnum):
    LOW = "low"
    STANDARD = "standard"
    HIGH_REGULATED = "high-regulated"


class ExecutionBudget(BaseModel):
    """Constraints on a run — enforced at plan time AND runtime."""

    deadline_ms: int | None = Field(None, description="Max wall-clock time in milliseconds")
    max_cost_usd: float | None = Field(None, description="Maximum cost ceiling in USD")
    max_tokens: int | None = Field(None, description="Maximum total token budget")
    risk_profile: RiskProfile = Field(RiskProfile.STANDARD, description="Risk tier")


class RunSpec(BaseModel):
    """Run configuration — input to POST /v1/runs."""

    objective: str = Field(..., min_length=1, description="Goal description")
    constraints: ExecutionBudget = Field(default_factory=ExecutionBudget)
    inputs: RunInputs = Field(default_factory=lambda: RunInputs())


class RunInputs(BaseModel):
    """Additional inputs for a run."""

    domain: str = Field("", description="Domain context for retrieval/planning")
    required_outputs: list[str] = Field(
        default_factory=list, description="Expected deliverables"
    )
    context_refs: list[str] = Field(
        default_factory=list, description="References to pre-existing context"
    )


class RunStatus(BaseModel):
    """Current state of a run — returned by GET /v1/runs/{run_id}."""

    run_id: str = Field(..., description="Unique run identifier")
    tenant_id: str = Field(..., description="Owning tenant")
    state: RunState = Field(..., description="Current lifecycle state")
    objective: str = Field(..., description="Original goal")
    plan_id: str | None = Field(None, description="Associated plan")
    next_action: str | None = Field(None, description="Suggested next step")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = Field(None)
    budget: ExecutionBudget = Field(default_factory=ExecutionBudget)
    cost_usd: float = Field(0.0, description="Accumulated cost")
    task_progress: TaskProgress = Field(default_factory=lambda: TaskProgress())
    error_message: str | None = Field(None, description="Error details if failed")


class TaskProgress(BaseModel):
    """Summarized task completion status within a run."""

    total: int = 0
    completed: int = 0
    failed: int = 0
    running: int = 0
    pending: int = 0
