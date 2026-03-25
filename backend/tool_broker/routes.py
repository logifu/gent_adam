"""Tool Broker API routes — POST /v1/tools/execute."""

from __future__ import annotations

import time
import uuid

import structlog
from fastapi import APIRouter, HTTPException

from shared.schemas.envelopes import ErrorCode, RequestMeta

logger = structlog.get_logger()

router = APIRouter(tags=["tools"])


class ExecuteToolRequest(RequestMeta):
    """POST /v1/tools/execute request body."""

    runtime_instance_id: str
    run_id: str
    task_attempt_id: str
    tool_name: str
    tool_grant_id: str
    payload: dict


@router.post("/tools/execute")
async def execute_tool(request: ExecuteToolRequest) -> dict:
    """Execute a mediated tool call.

    The Tool Broker:
    1. Validates the tool_grant_id (issued by Policy Enforcer)
    2. Retrieves credentials from Vault — workers never see raw secrets
    3. Executes the tool call
    4. Emits AuditEvent for every call (success AND blocked)
    5. Returns result with operation_id for long-running tools
    """
    start_time = time.perf_counter()
    tool_call_id = f"tc_{uuid.uuid4().hex[:12]}"

    logger.info(
        "tool_execute_requested",
        tenant_id=request.tenant_id,
        tool_name=request.tool_name,
        run_id=request.run_id,
        task_attempt_id=request.task_attempt_id,
        tool_grant_id=request.tool_grant_id,
    )

    # TODO: Validate tool_grant_id against Policy Enforcer
    # For now, accept all grants
    if not request.tool_grant_id:
        # Policy check: fail closed on missing grant
        logger.warning("tool_grant_missing", tool_name=request.tool_name)
        raise HTTPException(status_code=403, detail={
            "status": "error",
            "error": {
                "code": ErrorCode.AUTHZ_DENIED,
                "message": "Tool grant required. Missing or expired grant.",
                "retryable": False,
            },
        })

    # TODO: Retrieve credentials from Vault
    # TODO: Execute the actual tool call
    # TODO: Emit audit.event Kafka message

    latency_ms = int((time.perf_counter() - start_time) * 1000)

    # Stub response
    result = {
        "status": "ok",
        "data": {
            "tool_call_id": tool_call_id,
            "tool_name": request.tool_name,
            "status": "success",
            "result": {"message": f"[Stub] Tool '{request.tool_name}' executed successfully"},
            "operation_id": None,  # Set for long-running tools
            "latency_ms": latency_ms,
            "audited": True,
        },
        "meta": {"trace_id": request.trace_id, "version": "v1"},
    }

    logger.info(
        "tool_executed",
        tool_call_id=tool_call_id,
        tool_name=request.tool_name,
        latency_ms=latency_ms,
    )

    return result
