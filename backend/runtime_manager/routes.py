"""
Runtime Manager — API Routes

  POST /v1/runtime/instances               — Register new worker instance
  GET  /v1/runtime/instances               — List running instances
  POST /v1/runtime/instances/{id}/heartbeat — Worker heartbeat + metrics
  POST /v1/runtime/instances/{id}/stop      — Stop an instance
"""

import uuid
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from shared.schemas.envelopes import SuccessEnvelope

router = APIRouter()


class RegisterInstanceRequest(BaseModel):
    agent_version_id: str
    tenant_id: str
    environment: str = "development"
    capabilities: list[str] = Field(default_factory=list)
    resource_profile: dict | None = None


class HeartbeatRequest(BaseModel):
    status: str = "running"
    current_load: int = 0
    memory_usage_mb: float = 0
    cpu_usage_percent: float = 0
    active_tasks: list[str] = Field(default_factory=list)


@router.post("/instances")
async def register_instance(request: RegisterInstanceRequest):
    """Register a new runtime instance (worker) in the system."""
    instance_id = str(uuid.uuid4())
    return SuccessEnvelope(
        data={
            "runtime_instance_id": instance_id,
            "agent_version_id": request.agent_version_id,
            "tenant_id": request.tenant_id,
            "environment": request.environment,
            "status": "starting",
            "registered_at": datetime.utcnow().isoformat(),
        },
        meta={"action": "runtime_instance.registered"},
    )


@router.get("/instances")
async def list_instances(tenant_id: str = "tenant_dev", environment: str | None = None):
    """List all active runtime instances."""
    instances = [
        {
            "runtime_instance_id": "ri-001",
            "agent_version_id": "av-001",
            "status": "running",
            "environment": "development",
            "current_load": 2,
            "last_heartbeat": datetime.utcnow().isoformat(),
            "uptime_seconds": 14400,
        },
        {
            "runtime_instance_id": "ri-002",
            "agent_version_id": "av-001",
            "status": "running",
            "environment": "staging",
            "current_load": 0,
            "last_heartbeat": datetime.utcnow().isoformat(),
            "uptime_seconds": 3600,
        },
    ]
    if environment:
        instances = [i for i in instances if i["environment"] == environment]

    return SuccessEnvelope(data=instances, meta={"total": str(len(instances))})


@router.post("/instances/{instance_id}/heartbeat")
async def worker_heartbeat(instance_id: str, request: HeartbeatRequest):
    """Record a heartbeat from a worker instance."""
    return SuccessEnvelope(
        data={
            "runtime_instance_id": instance_id,
            "status": request.status,
            "acknowledged_at": datetime.utcnow().isoformat(),
            "next_heartbeat_due_seconds": 30,
        },
        meta={"action": "heartbeat.acknowledged"},
    )


@router.post("/instances/{instance_id}/stop")
async def stop_instance(instance_id: str):
    """Stop a runtime instance gracefully."""
    return SuccessEnvelope(
        data={
            "runtime_instance_id": instance_id,
            "previous_status": "running",
            "new_status": "stopped",
            "stopped_at": datetime.utcnow().isoformat(),
        },
        meta={"action": "runtime_instance.stopped"},
    )
