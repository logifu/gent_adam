"""Model Gateway API routes — POST /v1/models/generate."""

from __future__ import annotations

import time
import uuid

import structlog
from fastapi import APIRouter

from shared.schemas.envelopes import RequestMeta

logger = structlog.get_logger()

router = APIRouter(tags=["models"])


class ModelMessage(RequestMeta):
    """A single message in chat format."""
    role: str  # system | user | assistant
    content: str


class GenerateRequest(RequestMeta):
    """POST /v1/models/generate request body.

    Clients specify task_type + model_policy, NOT provider-specific params.
    The Gateway picks the optimal model based on policy, cost, and latency.
    """

    task_type: str  #  reasoning | code_generation | embedding | reranking
    model_policy: dict | None = None  # latency_tier, max_cost_usd
    context_refs: list[str] = []
    messages: list[dict] = []


@router.post("/models/generate")
async def generate(request: GenerateRequest) -> dict:
    """Text generation via provider-abstracted model routing.

    The Model Gateway:
    1. Selects provider/model based on task_type + model_policy
    2. Enforces per-tenant quota (429 on breach)
    3. Tracks cost per call and per run
    4. Returns response with token_counts, latency, model_route, cache_hit
    """
    start_time = time.perf_counter()
    generation_id = f"gen_{uuid.uuid4().hex[:12]}"

    logger.info(
        "model_generate_requested",
        tenant_id=request.tenant_id,
        task_type=request.task_type,
        message_count=len(request.messages),
    )

    # TODO: Route to real LLM provider based on task_type + model_policy
    # For now, return a stub response
    stub_content = (
        f"[Model Gateway Stub] Processed {request.task_type} request "
        f"with {len(request.messages)} messages. "
        f"Context refs: {request.context_refs}"
    )

    latency_ms = int((time.perf_counter() - start_time) * 1000)

    return {
        "status": "ok",
        "data": {
            "generation_id": generation_id,
            "content": stub_content,
            "model_route": "stub/default",
            "token_counts": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            },
            "latency_ms": latency_ms,
            "cache_hit": False,
            "cost_usd": 0.0,
        },
        "meta": {"trace_id": request.trace_id, "version": "v1"},
    }
