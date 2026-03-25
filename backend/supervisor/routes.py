"""Supervisor API routes — POST /v1/runs, GET /v1/runs/{run_id}, POST /v1/runs/{run_id}/cancel."""

from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_session
from shared.schemas.envelopes import ErrorCode, RequestMeta, SuccessEnvelope
from shared.schemas.runs import RunSpec, RunState, RunStatus, TaskProgress
from supervisor.models import RunModel

logger = structlog.get_logger()

router = APIRouter(tags=["runs"])


# ── Request / Response DTOs ──────────────────────────────────────

class CreateRunRequest(RequestMeta):
    """POST /v1/runs request body — extends RequestMeta with RunSpec fields."""
    objective: str
    constraints: dict | None = None
    inputs: dict | None = None


class CreateRunResponse(SuccessEnvelope):
    """POST /v1/runs response — returns the new run_id and initial state."""
    pass


# ── POST /v1/runs — Start a Governed Run ─────────────────────────

@router.post("/runs", status_code=201)
async def create_run(
    request: CreateRunRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Start a new governed run.

    1. Validate request and apply tenant constraints
    2. Create run record with state='planning'
    3. (Future) Start Temporal workflow for run lifecycle
    4. (Future) Emit run.created Kafka event
    """
    logger.info(
        "run_create_requested",
        tenant_id=request.tenant_id,
        objective=request.objective[:100],
        client_request_id=request.client_request_id,
    )

    # Idempotency check — same client_request_id returns same run
    existing = await session.execute(
        select(RunModel).where(
            RunModel.client_request_id == request.client_request_id
        )
    )
    existing_run = existing.scalar_one_or_none()

    if existing_run:
        logger.info("run_idempotent_hit", run_id=existing_run.run_id)
        return {
            "status": "ok",
            "data": {
                "run_id": existing_run.run_id,
                "state": existing_run.state,
                "next_action": existing_run.next_action or "plan_requested",
            },
            "meta": {"trace_id": request.trace_id, "version": "v1"},
        }

    # Create new run
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    constraints = request.constraints or {}
    inputs = request.inputs or {}

    run = RunModel(
        run_id=run_id,
        tenant_id=request.tenant_id,
        actor_id=request.actor_id,
        client_request_id=request.client_request_id,
        objective=request.objective,
        domain=inputs.get("domain", ""),
        risk_profile=constraints.get("risk_profile", "standard"),
        deadline_ms=constraints.get("deadline_ms"),
        max_cost_usd=constraints.get("max_cost_usd"),
        max_tokens=constraints.get("max_tokens"),
        state=RunState.PLANNING,
        next_action="plan_requested",
        inputs=inputs,
    )

    session.add(run)
    await session.flush()

    logger.info("run_created", run_id=run_id, state="planning")

    # TODO: Start Temporal Run Lifecycle Workflow
    # TODO: Emit run.created Kafka event

    return {
        "status": "ok",
        "data": {
            "run_id": run_id,
            "state": RunState.PLANNING,
            "next_action": "plan_requested",
        },
        "meta": {"trace_id": request.trace_id, "version": "v1"},
    }


# ── GET /v1/runs/{run_id} — Inspect Run State ───────────────────

@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get current state, milestones, task progress, and summary for a run."""
    result = await session.execute(
        select(RunModel).where(RunModel.run_id == run_id)
    )
    run = result.scalar_one_or_none()

    if not run:
        raise HTTPException(status_code=404, detail={
            "status": "error",
            "error": {
                "code": ErrorCode.NOT_FOUND,
                "message": f"Run {run_id} not found",
                "retryable": False,
            },
        })

    return {
        "status": "ok",
        "data": {
            "run_id": run.run_id,
            "tenant_id": run.tenant_id,
            "state": run.state,
            "objective": run.objective,
            "plan_id": run.plan_id,
            "next_action": run.next_action,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "updated_at": run.updated_at.isoformat() if run.updated_at else None,
            "cost_usd": run.cost_usd,
            "task_progress": {
                "total": run.total_tasks,
                "completed": run.completed_tasks,
                "failed": run.failed_tasks,
                "running": run.total_tasks - run.completed_tasks - run.failed_tasks,
                "pending": 0,
            },
            "error_message": run.error_message,
        },
        "meta": {"version": "v1"},
    }


# ── POST /v1/runs/{run_id}/cancel — Cancel Run ──────────────────

@router.post("/runs/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Cancel an in-flight run. Triggers graceful shutdown of workers.

    Partial results are preserved for audit.
    """
    result = await session.execute(
        select(RunModel).where(RunModel.run_id == run_id)
    )
    run = result.scalar_one_or_none()

    if not run:
        raise HTTPException(status_code=404, detail={
            "status": "error",
            "error": {
                "code": ErrorCode.NOT_FOUND,
                "message": f"Run {run_id} not found",
                "retryable": False,
            },
        })

    # Only running or awaiting_review runs can be cancelled
    cancellable_states = {RunState.PLANNING, RunState.QUEUED, RunState.RUNNING, RunState.AWAITING_REVIEW}
    if run.state not in cancellable_states:
        raise HTTPException(status_code=409, detail={
            "status": "error",
            "error": {
                "code": ErrorCode.CONFLICT,
                "message": f"Run {run_id} in state '{run.state}' cannot be cancelled",
                "retryable": False,
            },
        })

    run.state = RunState.CANCELLED
    run.next_action = None

    logger.info("run_cancelled", run_id=run_id, previous_state=run.state)

    # TODO: Signal Temporal workflow for graceful cancellation
    # TODO: Emit run.cancelled Kafka event

    return {
        "status": "ok",
        "data": {
            "run_id": run.run_id,
            "state": RunState.CANCELLED,
            "message": "Run cancelled. Partial results preserved for audit.",
        },
        "meta": {"version": "v1"},
    }
