"""
Result Aggregator — API Routes

  POST /v1/results/aggregate        — Aggregate task results for a run
  GET  /v1/results/runs/{run_id}    — Get aggregated result for a run
"""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from shared.schemas.envelopes import SuccessEnvelope

router = APIRouter()


class TaskResultInput(BaseModel):
    task_id: str
    task_type: str
    status: str  # "completed" | "failed" | "partial"
    output: dict | None = None
    error: dict | None = None
    tokens_used: int = 0
    cost_usd: float = 0.0
    duration_ms: int = 0


class AggregateRequest(BaseModel):
    run_id: str
    plan_id: str
    task_results: list[TaskResultInput]


@router.post("/aggregate")
async def aggregate_results(request: AggregateRequest):
    """
    Aggregate multiple task results into a unified run output.

    Production flow:
    1. Validate all expected tasks are present
    2. Merge outputs respecting task dependency order
    3. Calculate aggregate metrics (total cost, tokens, duration)
    4. Handle partial failures (mark run accordingly)
    5. Emit run.completed or run.failed event
    """
    total_tokens = sum(t.tokens_used for t in request.task_results)
    total_cost = sum(t.cost_usd for t in request.task_results)
    total_duration = sum(t.duration_ms for t in request.task_results)
    completed = sum(1 for t in request.task_results if t.status == "completed")
    failed = sum(1 for t in request.task_results if t.status == "failed")

    overall_status = "completed" if failed == 0 else ("partial" if completed > 0 else "failed")

    # Merge outputs in order
    merged_output = {}
    for t in request.task_results:
        if t.output:
            merged_output[t.task_id] = t.output

    return SuccessEnvelope(
        data={
            "run_id": request.run_id,
            "status": overall_status,
            "aggregated_output": merged_output,
            "metrics": {
                "total_tasks": len(request.task_results),
                "completed": completed,
                "failed": failed,
                "total_tokens": total_tokens,
                "total_cost_usd": round(total_cost, 4),
                "total_duration_ms": total_duration,
            },
            "aggregated_at": datetime.utcnow().isoformat(),
        },
        meta={"action": "results.aggregated"},
    )


@router.get("/runs/{run_id}")
async def get_run_result(run_id: str):
    """Get the aggregated result for a completed run."""
    return SuccessEnvelope(
        data={
            "run_id": run_id,
            "status": "completed",
            "aggregated_output": {
                "retrieve_context": {"documents_found": 12, "relevance_score": 0.87},
                "generate_architectures": {"candidates": 3, "recommended": "ReAct + RAG"},
                "evaluate_candidates": {"verdict": "pass", "safety_score": 0.92},
                "generate_brief": {"brief_sections": 6, "completeness": 0.87},
            },
            "metrics": {
                "total_tasks": 4,
                "completed": 4,
                "failed": 0,
                "total_tokens": 45000,
                "total_cost_usd": 2.40,
                "total_duration_ms": 18000,
            },
            "aggregated_at": datetime.utcnow().isoformat(),
        },
    )
