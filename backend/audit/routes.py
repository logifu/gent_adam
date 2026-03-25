"""
Audit Ledger — API Routes

  GET  /v1/audit/runs/{run_id}    — Full audit trail for a run
  GET  /v1/audit/events           — Query filtered audit events
  POST /v1/audit/events           — Record a new audit event (internal)
  POST /v1/audit/verify           — Verify hash chain integrity
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from audit.models import AuditEventModel
from shared.database import get_session
from shared.schemas.envelopes import SuccessEnvelope

router = APIRouter()


# ── Request / Response Models ────────────────────────────

class RecordEventRequest(BaseModel):
    tenant_id: str
    run_id: str | None = None
    task_attempt_id: str | None = None
    event_type: str
    actor_id: str
    service: str
    action: str
    resource_type: str | None = None
    resource_id: str | None = None
    payload: dict | None = None


class AuditEventResponse(BaseModel):
    event_id: str
    sequence_number: int
    tenant_id: str
    run_id: str | None
    event_type: str
    actor_id: str
    service: str
    action: str
    resource_type: str | None
    resource_id: str | None
    payload: dict | None
    previous_hash: str | None
    event_hash: str
    timestamp: str


class VerifyResult(BaseModel):
    status: str  # "valid" | "broken"
    events_checked: int
    chain_valid: bool
    first_broken_at: int | None = None
    message: str


# ── Routes ───────────────────────────────────────────────

@router.get("/runs/{run_id}")
async def get_run_audit_trail(
    run_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get the complete audit trail for a specific run."""
    query = (
        select(AuditEventModel)
        .where(AuditEventModel.run_id == uuid.UUID(run_id))
        .order_by(AuditEventModel.sequence_number.asc())
    )
    result = await session.execute(query)
    events = result.scalars().all()

    return SuccessEnvelope(
        data=[
            AuditEventResponse(
                event_id=str(e.id),
                sequence_number=e.sequence_number,
                tenant_id=e.tenant_id,
                run_id=str(e.run_id) if e.run_id else None,
                event_type=e.event_type,
                actor_id=e.actor_id,
                service=e.service,
                action=e.action,
                resource_type=e.resource_type,
                resource_id=e.resource_id,
                payload=e.payload,
                previous_hash=e.previous_hash,
                event_hash=e.event_hash,
                timestamp=e.timestamp.isoformat(),
            )
            for e in events
        ],
        meta={"run_id": run_id, "event_count": str(len(events))},
    )


@router.get("/events")
async def query_audit_events(
    tenant_id: str,
    event_type: str | None = None,
    actor_id: str | None = None,
    service: str | None = None,
    since: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
):
    """Query audit events with filters."""
    query = (
        select(AuditEventModel)
        .where(AuditEventModel.tenant_id == tenant_id)
    )

    if event_type:
        query = query.where(AuditEventModel.event_type == event_type)
    if actor_id:
        query = query.where(AuditEventModel.actor_id == actor_id)
    if service:
        query = query.where(AuditEventModel.service == service)
    if since:
        query = query.where(AuditEventModel.timestamp >= datetime.fromisoformat(since))

    query = query.order_by(AuditEventModel.sequence_number.desc()).limit(limit).offset(offset)

    result = await session.execute(query)
    events = result.scalars().all()

    # Get total count
    count_query = select(func.count()).select_from(AuditEventModel).where(
        AuditEventModel.tenant_id == tenant_id
    )
    total = (await session.execute(count_query)).scalar() or 0

    return SuccessEnvelope(
        data=[
            AuditEventResponse(
                event_id=str(e.id),
                sequence_number=e.sequence_number,
                tenant_id=e.tenant_id,
                run_id=str(e.run_id) if e.run_id else None,
                event_type=e.event_type,
                actor_id=e.actor_id,
                service=e.service,
                action=e.action,
                resource_type=e.resource_type,
                resource_id=e.resource_id,
                payload=e.payload,
                previous_hash=e.previous_hash,
                event_hash=e.event_hash,
                timestamp=e.timestamp.isoformat(),
            )
            for e in events
        ],
        meta={"total": str(total), "limit": str(limit), "offset": str(offset)},
    )


@router.post("/events")
async def record_audit_event(
    request: RecordEventRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Record a new audit event with hash chaining.

    This is called internally by other services (via Kafka consumer
    in production, or direct HTTP in development).
    """
    # Get the previous hash for chain continuity
    prev_query = (
        select(AuditEventModel.event_hash, AuditEventModel.sequence_number)
        .where(AuditEventModel.tenant_id == request.tenant_id)
        .order_by(AuditEventModel.sequence_number.desc())
        .limit(1)
    )
    prev_result = await session.execute(prev_query)
    prev_row = prev_result.first()

    previous_hash = prev_row[0] if prev_row else None
    next_sequence = (prev_row[1] + 1) if prev_row else 1

    timestamp = datetime.utcnow()

    # Compute hash chain
    event_hash = AuditEventModel.compute_hash(
        previous_hash=previous_hash,
        event_type=request.event_type,
        payload=request.payload,
        timestamp=timestamp,
    )

    event = AuditEventModel(
        tenant_id=request.tenant_id,
        run_id=uuid.UUID(request.run_id) if request.run_id else None,
        task_attempt_id=uuid.UUID(request.task_attempt_id) if request.task_attempt_id else None,
        event_type=request.event_type,
        actor_id=request.actor_id,
        service=request.service,
        action=request.action,
        resource_type=request.resource_type,
        resource_id=request.resource_id,
        payload=request.payload,
        previous_hash=previous_hash,
        event_hash=event_hash,
        sequence_number=next_sequence,
        timestamp=timestamp,
    )
    session.add(event)
    await session.flush()

    return SuccessEnvelope(
        data=AuditEventResponse(
            event_id=str(event.id),
            sequence_number=event.sequence_number,
            tenant_id=event.tenant_id,
            run_id=str(event.run_id) if event.run_id else None,
            event_type=event.event_type,
            actor_id=event.actor_id,
            service=event.service,
            action=event.action,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            payload=event.payload,
            previous_hash=event.previous_hash,
            event_hash=event.event_hash,
            timestamp=event.timestamp.isoformat(),
        ),
        meta={"action": "audit_event.recorded", "chain_position": str(event.sequence_number)},
    )


@router.post("/verify")
async def verify_chain_integrity(
    tenant_id: str,
    limit: int = Query(default=1000, le=10000),
    session: AsyncSession = Depends(get_session),
):
    """
    Verify the hash chain integrity for a tenant.

    Walks through events in sequence order and recomputes each hash.
    If any computed hash doesn't match the stored hash, the chain is broken.
    """
    query = (
        select(AuditEventModel)
        .where(AuditEventModel.tenant_id == tenant_id)
        .order_by(AuditEventModel.sequence_number.asc())
        .limit(limit)
    )
    result = await session.execute(query)
    events = result.scalars().all()

    if not events:
        return SuccessEnvelope(
            data=VerifyResult(
                status="valid",
                events_checked=0,
                chain_valid=True,
                message="No events found for this tenant",
            ),
        )

    previous_hash = None
    for i, event in enumerate(events):
        expected_hash = AuditEventModel.compute_hash(
            previous_hash=previous_hash,
            event_type=event.event_type,
            payload=event.payload,
            timestamp=event.timestamp,
        )

        if expected_hash != event.event_hash:
            return SuccessEnvelope(
                data=VerifyResult(
                    status="broken",
                    events_checked=i + 1,
                    chain_valid=False,
                    first_broken_at=event.sequence_number,
                    message=f"Hash chain broken at sequence {event.sequence_number}. "
                            f"Expected {expected_hash[:16]}..., got {event.event_hash[:16]}...",
                ),
            )

        previous_hash = event.event_hash

    return SuccessEnvelope(
        data=VerifyResult(
            status="valid",
            events_checked=len(events),
            chain_valid=True,
            message=f"All {len(events)} events verified — chain is intact",
        ),
    )
