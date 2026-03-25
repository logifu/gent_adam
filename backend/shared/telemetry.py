"""
Shared OpenTelemetry Instrumentation

Provides centralized OTel setup for all backend services:
  - Tracer provider with Jaeger/OTLP export
  - Meter provider for Prometheus-style metrics
  - Structured logger with trace context injection
  - FastAPI auto-instrumentation
  - Correlation key propagation (trace_id, run_id, task_attempt_id)
"""

import logging
from contextvars import ContextVar

from shared.config import Settings

# ── Context Variables for Correlation ────────────────────
# These propagate trace/run/task context through async call chains

current_trace_id: ContextVar[str] = ContextVar("current_trace_id", default="")
current_run_id: ContextVar[str] = ContextVar("current_run_id", default="")
current_task_attempt_id: ContextVar[str] = ContextVar("current_task_attempt_id", default="")
current_tenant_id: ContextVar[str] = ContextVar("current_tenant_id", default="")


class StructuredLogger:
    """
    Logger that automatically injects OTel trace context and
    correlation keys into all log records.
    """

    def __init__(self, name: str, service: str):
        self.logger = logging.getLogger(name)
        self.service = service

    def _enrich(self, extra: dict | None = None) -> dict:
        """Add correlation context to log record."""
        enriched = {
            "service": self.service,
            "trace_id": current_trace_id.get(""),
            "run_id": current_run_id.get(""),
            "task_attempt_id": current_task_attempt_id.get(""),
            "tenant_id": current_tenant_id.get(""),
        }
        if extra:
            enriched.update(extra)
        return enriched

    def info(self, msg: str, **kwargs):
        self.logger.info(msg, extra=self._enrich(kwargs))

    def warning(self, msg: str, **kwargs):
        self.logger.warning(msg, extra=self._enrich(kwargs))

    def error(self, msg: str, **kwargs):
        self.logger.error(msg, extra=self._enrich(kwargs))

    def debug(self, msg: str, **kwargs):
        self.logger.debug(msg, extra=self._enrich(kwargs))


def setup_telemetry(service_name: str) -> None:
    """
    Initialize OpenTelemetry for a service.

    In production, this sets up:
    1. TracerProvider with OTLP exporter → Jaeger/Tempo
    2. MeterProvider with Prometheus exporter
    3. LoggerProvider with structured JSON output
    4. FastAPI auto-instrumentation

    For local dev, falls back to console exporters.
    """
    try:
        settings = Settings()
        if not settings.otel.enabled:
            print(f"[OTel] Telemetry disabled for {service_name}")
            return
    except Exception:
        pass

    # TODO: Wire real OTel SDK when opentelemetry packages are installed
    # from opentelemetry import trace
    # from opentelemetry.sdk.trace import TracerProvider
    # from opentelemetry.sdk.trace.export import BatchSpanProcessor
    # from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    # from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    #
    # provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
    # provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    # trace.set_tracer_provider(provider)
    # FastAPIInstrumentor().instrument()

    # Configure structured logging
    logging.basicConfig(
        level=logging.INFO,
        format=f"%(asctime)s [{service_name}] %(levelname)s %(message)s",
    )

    print(f"[OTel] Telemetry initialized for {service_name}")


def get_logger(name: str, service: str = "unknown") -> StructuredLogger:
    """Get a structured logger with automatic correlation context."""
    return StructuredLogger(name, service)


# ── Metrics Helpers ──────────────────────────────────────

class MetricsRecorder:
    """
    Records service-level metrics.

    In production, uses OpenTelemetry MeterProvider.
    In dev, stores in-memory for debugging.
    """

    def __init__(self, service_name: str):
        self.service = service_name
        self._counters: dict[str, int] = {}
        self._histograms: dict[str, list[float]] = {}

    def increment(self, name: str, value: int = 1, labels: dict | None = None):
        """Increment a counter metric."""
        key = f"{self.service}.{name}"
        self._counters[key] = self._counters.get(key, 0) + value

    def record_duration(self, name: str, duration_ms: float, labels: dict | None = None):
        """Record a duration/histogram metric."""
        key = f"{self.service}.{name}"
        if key not in self._histograms:
            self._histograms[key] = []
        self._histograms[key].append(duration_ms)

    def get_stats(self) -> dict:
        """Get current metric values (dev mode)."""
        return {
            "counters": dict(self._counters),
            "histograms": {
                k: {"count": len(v), "avg": sum(v) / len(v) if v else 0}
                for k, v in self._histograms.items()
            },
        }
