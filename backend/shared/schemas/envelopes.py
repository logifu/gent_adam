"""Standard request/response envelopes — all APIs wrap data in these."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RequestMeta(BaseModel):
    """Included in ALL requests for tenant isolation, tracing, and idempotency."""

    tenant_id: str = Field(..., description="Tenant isolation boundary")
    trace_id: str = Field(..., description="Distributed tracing correlation")
    client_request_id: str = Field(..., description="Idempotency key (24h dedup window)")
    actor_id: str = Field(..., description="Human or machine identity")
    policy_profile: str | None = Field(None, description="Named policy set to apply")
    requested_by_role: str | None = Field(None, description="Caller's product role for UI/audit")


class SuccessEnvelope(BaseModel):
    """Standard success response wrapper."""

    status: str = "ok"
    data: dict[str, Any] = Field(default_factory=dict, description="Service-specific payload")
    meta: ResponseMeta = Field(default_factory=lambda: ResponseMeta())


class ResponseMeta(BaseModel):
    """Metadata included in every success response."""

    trace_id: str = ""
    version: str = "v1"
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ErrorDetail(BaseModel):
    """Structured error information."""

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable explanation")
    retryable: bool = Field(False, description="Whether the client should retry")
    correlation_id: str = Field("", description="Links to trace/audit for debugging")
    details: dict[str, Any] | None = Field(None, description="Additional context")


class ErrorEnvelope(BaseModel):
    """Standard error response wrapper."""

    status: str = "error"
    error: ErrorDetail


# Standard error codes
class ErrorCode:
    VALIDATION_FAILED = "VALIDATION_FAILED"  # 400
    AUTHN_REQUIRED = "AUTHN_REQUIRED"  # 401
    AUTHZ_DENIED = "AUTHZ_DENIED"  # 403
    NOT_FOUND = "NOT_FOUND"  # 404
    CONFLICT = "CONFLICT"  # 409
    RATE_LIMITED = "RATE_LIMITED"  # 429
    UPSTREAM_TIMEOUT = "UPSTREAM_TIMEOUT"  # 504
