"""Task execution schemas — results and aggregation from the Execution Plane."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class TaskStatus(StrEnum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class TaskAttempt(BaseModel):
    """One scheduled execution attempt for a task — created per retry/placement."""

    task_attempt_id: str = Field(..., description="Unique attempt identifier")
    task_id: str = Field(..., description="Parent task")
    run_id: str = Field(..., description="Parent run")
    runtime_instance_id: str = Field(..., description="Assigned worker")
    attempt_number: int = Field(1, description="Retry count (1-based)")
    status: TaskStatus = Field(TaskStatus.PENDING)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    error_message: str | None = None


class TaskResult(BaseModel):
    """Outcome of a task execution — produced by Runtime Worker, consumed by Aggregator."""

    task_id: str = Field(..., description="Which task produced this result")
    task_attempt_id: str = Field(..., description="Which attempt produced this result")
    run_id: str = Field(..., description="Parent run for correlation")
    status: TaskStatus = Field(..., description="Final status of the task")
    outputs: dict[str, object] = Field(default_factory=dict, description="Task-specific outputs")
    artifact_refs: list[str] = Field(
        default_factory=list, description="References to produced artifacts"
    )
    cost_usd: float = Field(0.0, description="Actual cost incurred")
    latency_ms: int = Field(0, description="Wall-clock execution time")
    token_count: int = Field(0, description="Total tokens consumed")
    trace_id: str = Field("", description="Distributed trace correlation")
    error_message: str | None = None
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class AggregatedResult(BaseModel):
    """Normalized combined output of all tasks in a run."""

    run_id: str = Field(..., description="Parent run")
    total_tasks: int = Field(0)
    completed_tasks: int = Field(0)
    failed_tasks: int = Field(0)
    total_cost_usd: float = Field(0.0)
    total_latency_ms: int = Field(0)
    outputs: dict[str, object] = Field(default_factory=dict)
    artifact_refs: list[str] = Field(default_factory=list)
    aggregated_at: datetime = Field(default_factory=datetime.utcnow)
