"""
Audit Ledger — SQLAlchemy ORM Model

The audit_events table is in the `trust` schema and is append-only.
Hash chaining: each event's hash = SHA-256(prev_hash + event_type + payload_json + timestamp).
"""

import hashlib
import json
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from shared.database import Base


class AuditEventModel(Base):
    """
    Append-only audit event with hash chaining.

    Never update or delete rows in this table.
    The hash chain provides tamper-evidence: if any event is modified
    or deleted, the chain breaks on the next verification pass.
    """
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_run_id", "run_id"),
        Index("ix_audit_events_event_type", "event_type"),
        Index("ix_audit_events_timestamp", "timestamp"),
        {"schema": "trust"},
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    sequence_number = Column(BigInteger, nullable=False, unique=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    run_id = Column(UUID(as_uuid=True), nullable=True)
    task_attempt_id = Column(UUID(as_uuid=True), nullable=True)

    # What happened
    event_type = Column(String(128), nullable=False)
    actor_id = Column(String(128), nullable=False)
    service = Column(String(64), nullable=False)
    action = Column(String(128), nullable=False)

    # What was affected
    resource_type = Column(String(64), nullable=True)
    resource_id = Column(String(256), nullable=True)
    payload = Column(JSONB, nullable=True)

    # Hash chain
    previous_hash = Column(String(128), nullable=True)
    event_hash = Column(String(128), nullable=False)

    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)

    @staticmethod
    def compute_hash(
        previous_hash: str | None,
        event_type: str,
        payload: dict | None,
        timestamp: datetime,
    ) -> str:
        """Compute SHA-256 hash for the event chain."""
        data = (
            (previous_hash or "GENESIS")
            + event_type
            + json.dumps(payload or {}, sort_keys=True, default=str)
            + timestamp.isoformat()
        )
        return hashlib.sha256(data.encode("utf-8")).hexdigest()
