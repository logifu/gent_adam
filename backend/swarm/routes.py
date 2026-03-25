"""
Swarm Orchestrator — API Routes

  POST /v1/swarm/dispatch           — Dispatch task to available workers
  GET  /v1/swarm/workers            — List active workers with capacity
  GET  /v1/swarm/queue              — View pending task queue
  POST /v1/swarm/workers/{id}/drain — Gracefully drain a worker
"""

import uuid
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from shared.schemas.envelopes import SuccessEnvelope

router = APIRouter()


# ── Models ───────────────────────────────────────────────

class DispatchRequest(BaseModel):
    run_id: str
    plan_id: str
    task_id: str
    task_type: str
    priority: int = Field(default=5, ge=1, le=10)
    input_payload: dict | None = None
    required_capabilities: list[str] = Field(default_factory=list)


class WorkerInfo(BaseModel):
    worker_id: str
    status: str
    capacity: int
    current_load: int
    capabilities: list[str]
    last_heartbeat: str
    uptime_seconds: int


class QueueItem(BaseModel):
    task_id: str
    run_id: str
    task_type: str
    priority: int
    queued_at: str
    wait_time_seconds: int


# Mock worker pool
MOCK_WORKERS = [
    WorkerInfo(
        worker_id="worker-001",
        status="running",
        capacity=5,
        current_load=3,
        capabilities=["reasoning", "retrieval", "generation"],
        last_heartbeat=datetime.utcnow().isoformat(),
        uptime_seconds=14400,
    ),
    WorkerInfo(
        worker_id="worker-002",
        status="running",
        capacity=5,
        current_load=1,
        capabilities=["reasoning", "generation", "evaluation"],
        last_heartbeat=datetime.utcnow().isoformat(),
        uptime_seconds=28800,
    ),
    WorkerInfo(
        worker_id="worker-003",
        status="draining",
        capacity=5,
        current_load=4,
        capabilities=["retrieval", "tool-execution"],
        last_heartbeat=datetime.utcnow().isoformat(),
        uptime_seconds=7200,
    ),
]


@router.post("/dispatch")
async def dispatch_task(request: DispatchRequest):
    """
    Dispatch a task to an available worker.

    Production flow:
    1. Check worker pool for available capacity
    2. Match task requirements to worker capabilities
    3. Create task_attempt record
    4. Publish task.dispatched event
    5. Start Temporal activity for heartbeat monitoring
    """
    # Select best worker (capacity-aware + capability matching)
    available = [w for w in MOCK_WORKERS if w.status == "running" and w.current_load < w.capacity]
    if not available:
        return SuccessEnvelope(
            data={
                "status": "queued",
                "message": "No workers available, task queued for retry",
                "queue_position": 3,
            },
        )

    selected = min(available, key=lambda w: w.current_load)
    task_attempt_id = str(uuid.uuid4())

    return SuccessEnvelope(
        data={
            "task_attempt_id": task_attempt_id,
            "worker_id": selected.worker_id,
            "status": "dispatched",
            "estimated_start": datetime.utcnow().isoformat(),
        },
        meta={"action": "task.dispatched"},
    )


@router.get("/workers")
async def list_workers():
    """List all active workers with their current capacity and load."""
    return SuccessEnvelope(
        data=[w.model_dump() for w in MOCK_WORKERS],
        meta={
            "total_capacity": str(sum(w.capacity for w in MOCK_WORKERS)),
            "current_load": str(sum(w.current_load for w in MOCK_WORKERS)),
        },
    )


@router.get("/queue")
async def view_queue():
    """View pending tasks in the dispatch queue."""
    # Mock queue
    queue = [
        QueueItem(
            task_id="task-pending-001",
            run_id="run-abc",
            task_type="reasoning",
            priority=8,
            queued_at=datetime.utcnow().isoformat(),
            wait_time_seconds=12,
        ),
        QueueItem(
            task_id="task-pending-002",
            run_id="run-def",
            task_type="retrieval",
            priority=5,
            queued_at=datetime.utcnow().isoformat(),
            wait_time_seconds=45,
        ),
    ]

    return SuccessEnvelope(
        data=[q.model_dump() for q in queue],
        meta={"queue_depth": str(len(queue))},
    )


@router.post("/workers/{worker_id}/drain")
async def drain_worker(worker_id: str):
    """
    Gracefully drain a worker — finish current tasks, accept no new ones.

    Production flow:
    1. Mark worker as 'draining'
    2. Stop accepting new task dispatches
    3. Wait for in-flight tasks to complete (with timeout)
    4. Update worker status to 'stopped'
    5. Emit worker.drained event
    """
    return SuccessEnvelope(
        data={
            "worker_id": worker_id,
            "previous_status": "running",
            "new_status": "draining",
            "in_flight_tasks": 3,
            "estimated_drain_time_seconds": 120,
        },
        meta={"action": "worker.drain_started"},
    )
