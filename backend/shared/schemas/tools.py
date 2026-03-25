"""Tool Broker schemas — the choke point for ALL external tool/API calls."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ToolGrant(BaseModel):
    """Pre-approved permission to invoke a specific tool — issued by Policy Enforcer."""

    tool_grant_id: str = Field(..., description="Unique grant identifier")
    tool_name: str = Field(..., description="Registered tool identifier")
    runtime_instance_id: str = Field(..., description="Worker authorized to use this grant")
    run_id: str = Field(..., description="Scope: which run this grant is for")
    granted_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(..., description="Short-lived grant expiry")
    constraints: dict[str, object] = Field(
        default_factory=dict, description="Usage limits for this grant"
    )


class ToolCall(BaseModel):
    """Request to execute a mediated tool call — POST /v1/tools/execute."""

    runtime_instance_id: str = Field(..., description="Worker identity making the call")
    run_id: str = Field(..., description="Parent run for audit correlation")
    task_attempt_id: str = Field(..., description="Specific task attempt for tracing")
    tool_name: str = Field(..., description="Registered tool identifier")
    tool_grant_id: str = Field(..., description="Pre-approved grant from Policy Enforcer")
    payload: dict[str, object] = Field(..., description="Tool-specific input payload")


class ToolResult(BaseModel):
    """Response from a tool execution."""

    tool_call_id: str = Field(..., description="Unique tool call identifier")
    tool_name: str = Field(..., description="Which tool was invoked")
    status: str = Field(..., description="success | error | timeout")
    result: dict[str, object] = Field(default_factory=dict, description="Tool output")
    operation_id: str | None = Field(
        None, description="For long-running tools — poll with this ID"
    )
    latency_ms: int = Field(0, description="Execution time")
    audited: bool = Field(True, description="Whether audit event was emitted")
    error_message: str | None = None
