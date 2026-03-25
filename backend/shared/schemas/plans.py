"""Plan schemas — the Planner's domain. Compiler, not scheduler."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TaskDependency(BaseModel):
    """A dependency link between tasks in the DAG."""

    from_task_id: str = Field(..., description="Upstream task that must complete first")
    to_task_id: str = Field(..., description="Downstream task that depends on upstream")


class TaskSpec(BaseModel):
    """Individual executable task within a plan — the unit of work for the Swarm."""

    task_id: str = Field(..., description="Unique identifier for this task")
    type: str = Field(..., description="Task type: retrieve_context, generate_architectures, etc.")
    deps: list[str] = Field(default_factory=list, description="Task IDs that must complete first")
    description: str = Field("", description="Human-readable task description")
    tool_policy: dict[str, str] = Field(
        default_factory=dict, description="Tool access rules for this task"
    )
    context_refs: list[str] = Field(
        default_factory=list, description="Knowledge references for grounding"
    )
    budget: TaskBudget = Field(default_factory=lambda: TaskBudget())
    metadata: dict[str, str] = Field(default_factory=dict)


class TaskBudget(BaseModel):
    """Per-task resource limits — subset of the run's ExecutionBudget."""

    max_tokens: int | None = Field(None, description="Token limit for this task")
    max_cost_usd: float | None = Field(None, description="Cost limit for this task")
    timeout_ms: int | None = Field(None, description="Task-level timeout")


class PlanSpec(BaseModel):
    """Generated plan with task graph — output of POST /v1/plans."""

    plan_id: str = Field(..., description="Unique plan identifier")
    run_id: str = Field(..., description="Parent run")
    tasks: list[TaskSpec] = Field(default_factory=list, description="Executable task DAG")
    dependencies: list[TaskDependency] = Field(
        default_factory=list, description="Explicit dependency edges"
    )
    estimated_cost_usd: float | None = Field(None, description="Estimated total cost")
    estimated_duration_ms: int | None = Field(None, description="Estimated wall-clock time")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, str] = Field(default_factory=dict)
