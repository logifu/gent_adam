"""Planner API routes — POST /v1/plans."""

from __future__ import annotations

import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter

from shared.schemas.envelopes import RequestMeta

logger = structlog.get_logger()

router = APIRouter(tags=["plans"])


class CreatePlanRequest(RequestMeta):
    """POST /v1/plans request body."""

    goal: str
    budget: dict | None = None
    policy_profile: str | None = None


@router.post("/plans")
async def create_plan(request: CreatePlanRequest) -> dict:
    """Compile a goal into a budgeted Task DAG.

    The Planner decomposes a high-level goal into a dependency graph
    of executable tasks. It assigns budgets per task and identifies
    required tools and knowledge sources.

    Note: This is a COMPILER. It returns a plan but never schedules work.
    """
    logger.info(
        "plan_compilation_requested",
        tenant_id=request.tenant_id,
        goal=request.goal[:100],
    )

    plan_id = f"plan_{uuid.uuid4().hex[:12]}"

    # Generate a default Task DAG for the goal
    # In production, this would use the Model Gateway for LLM-powered planning
    tasks = [
        {
            "task_id": "t1",
            "type": "retrieve_context",
            "deps": [],
            "description": "Retrieve relevant knowledge for the goal",
            "tool_policy": {},
            "context_refs": [],
        },
        {
            "task_id": "t2",
            "type": "generate_architectures",
            "deps": ["t1"],
            "description": "Generate candidate architectures using retrieved context",
            "tool_policy": {},
            "context_refs": [],
        },
        {
            "task_id": "t3",
            "type": "evaluate_candidates",
            "deps": ["t2"],
            "description": "Evaluate and score candidate architectures",
            "tool_policy": {},
            "context_refs": [],
        },
        {
            "task_id": "t4",
            "type": "generate_brief",
            "deps": ["t3"],
            "description": "Compile the final brief with chosen architecture",
            "tool_policy": {},
            "context_refs": [],
        },
    ]

    logger.info(
        "plan_compiled",
        plan_id=plan_id,
        task_count=len(tasks),
    )

    # TODO: Emit plan.ready Kafka event

    return {
        "status": "ok",
        "data": {
            "plan_id": plan_id,
            "tasks": tasks,
        },
        "meta": {
            "trace_id": request.trace_id,
            "version": "v1",
            "generated_at": datetime.utcnow().isoformat(),
        },
    }
