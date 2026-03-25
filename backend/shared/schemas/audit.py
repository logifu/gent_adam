"""Audit schemas — append-only evidence stream with hash chaining."""

from __future__ import annotations

import hashlib
from datetime import datetime

from pydantic import BaseModel, Field


class AuditEvent(BaseModel):
    """Immutable audit trail record — append-only, hash-chained per stream.

    Each event's hash includes the previous event's hash, creating a
    tamper-evident chain. Modifying any event invalidates all subsequent hashes.

    Rule: Every tool call, release action, and policy decision MUST emit one.
    """

    event_id: str = Field(..., description="Globally unique event identifier")
    run_id: str = Field("", description="Business correlation")
    task_attempt_id: str = Field("", description="Execution correlation")
    actor: str = Field(..., description="Who/what performed the action")
    action: str = Field(..., description="What was done")
    target: str = Field("", description="What was acted upon")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    payload: dict[str, object] = Field(default_factory=dict, description="Event-specific data")
    prev_hash: str = Field("", description="Hash of the previous event in the stream")
    hash: str = Field("", description="SHA-256(prev_hash + payload + timestamp)")

    def compute_hash(self) -> str:
        """Compute SHA-256 hash for this event, chaining from prev_hash."""
        content = f"{self.prev_hash}{self.payload}{self.timestamp.isoformat()}"
        return hashlib.sha256(content.encode()).hexdigest()

    def seal(self) -> "AuditEvent":
        """Compute and set the hash for this event."""
        self.hash = self.compute_hash()
        return self
