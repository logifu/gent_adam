"""Async event envelope — standard wrapper for all Kafka events."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class EventEnvelope(BaseModel):
    """Every async event follows this envelope — 8 core topics use this format.

    Topics: run.created, plan.ready, task.submitted, task.completed,
    episode.written, audit.event, eval.completed, release.promoted
    """

    topic: str = Field(..., description="Event topic name")
    event_version: str = Field("1.0", description="Schema version for forward compatibility")
    event_id: str = Field(..., description="Globally unique event identifier")
    trace_id: str = Field(..., description="Distributed tracing correlation")
    run_id: str = Field("", description="Business correlation (when available)")
    task_attempt_id: str = Field("", description="Execution correlation (when applicable)")
    producer: str = Field(..., description="Publishing service name")
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    payload: dict[str, object] = Field(..., description="Topic-specific data")


# Topic constants
class EventTopic:
    RUN_CREATED = "run.created"
    PLAN_READY = "plan.ready"
    TASK_SUBMITTED = "task.submitted"
    TASK_COMPLETED = "task.completed"
    EPISODE_WRITTEN = "episode.written"
    AUDIT_EVENT = "audit.event"
    EVAL_COMPLETED = "eval.completed"
    RELEASE_PROMOTED = "release.promoted"
