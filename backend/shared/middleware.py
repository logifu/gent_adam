"""Shared middleware — auth, tracing, error handling for all FastAPI services."""

from __future__ import annotations

import time
import uuid
from typing import Any

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from shared.schemas.envelopes import ErrorCode, ErrorDetail, ErrorEnvelope

logger = structlog.get_logger()


def setup_middleware(app: FastAPI) -> None:
    """Register all shared middleware on a FastAPI application."""

    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next: Any) -> Response:
        """Inject trace IDs, measure latency, add correlation headers."""
        # Generate or extract trace ID
        trace_id = request.headers.get("X-Trace-Id", f"trc_{uuid.uuid4().hex[:12]}")
        request_id = request.headers.get("X-Request-Id", f"req_{uuid.uuid4().hex[:12]}")

        # Bind to structured logging context
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            trace_id=trace_id,
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        start_time = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                "unhandled_exception",
                error=str(exc),
                latency_ms=latency_ms,
            )
            return JSONResponse(
                status_code=500,
                content=ErrorEnvelope(
                    error=ErrorDetail(
                        code="INTERNAL_ERROR",
                        message="An unexpected error occurred.",
                        retryable=False,
                        correlation_id=trace_id,
                    )
                ).model_dump(),
            )

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        # Add correlation headers to response
        response.headers["X-Trace-Id"] = trace_id
        response.headers["X-Request-Id"] = request_id
        response.headers["X-Response-Time-Ms"] = str(latency_ms)

        logger.info(
            "request_completed",
            status_code=response.status_code,
            latency_ms=latency_ms,
        )

        return response

    @app.exception_handler(ValueError)
    async def validation_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content=ErrorEnvelope(
                error=ErrorDetail(
                    code=ErrorCode.VALIDATION_FAILED,
                    message=str(exc),
                    retryable=False,
                )
            ).model_dump(),
        )
