"""
Sandbox Executor Routes

Manages K8s-based sandboxed execution environments.
Endpoints:
  POST   /v1/sandbox/create     — Create isolated sandbox pod
  GET    /v1/sandbox/{id}       — Get sandbox status
  POST   /v1/sandbox/{id}/exec  — Execute command in sandbox
  DELETE /v1/sandbox/{id}       — Destroy sandbox (cleanup)
  GET    /v1/sandbox/{id}/logs  — Stream sandbox logs
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter(tags=["sandbox"])


# ── Schemas ────────────────────────────────────────────────

class SandboxSpec(BaseModel):
    """Specification for creating a sandbox environment."""
    task_id: str = Field(..., description="Task that owns this sandbox")
    agent_id: str = Field(..., description="Agent identity for the sandbox")
    runtime: str = Field(default="python3.12", description="Runtime environment")
    cpu_limit: str = Field(default="500m", description="CPU limit (K8s notation)")
    memory_limit: str = Field(default="512Mi", description="Memory limit")
    disk_limit: str = Field(default="1Gi", description="Ephemeral storage limit")
    timeout_seconds: int = Field(default=300, description="Max execution time")
    network_policy: str = Field(default="restricted", description="Network policy: restricted | allowlist | none")
    egress_allowlist: list[str] = Field(default_factory=list, description="Allowed egress domains")
    env_vars: dict[str, str] = Field(default_factory=dict, description="Environment variables to inject")


class SandboxStatus(BaseModel):
    sandbox_id: str
    task_id: str
    agent_id: str
    status: str  # creating | running | completed | failed | terminated
    runtime: str
    created_at: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    exit_code: Optional[int] = None
    resource_usage: dict = Field(default_factory=dict)
    pod_name: Optional[str] = None
    node_name: Optional[str] = None


class ExecRequest(BaseModel):
    command: str = Field(..., description="Command to execute in the sandbox")
    timeout_seconds: int = Field(default=60, description="Command-level timeout")
    working_dir: str = Field(default="/workspace", description="Working directory")
    stdin: Optional[str] = Field(default=None, description="Standard input")


class ExecResult(BaseModel):
    exec_id: str
    sandbox_id: str
    command: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    resource_snapshot: dict


class SandboxLog(BaseModel):
    timestamp: str
    stream: str  # stdout | stderr | system
    message: str


# ── In-memory store (production: K8s API) ─────────────────

_sandboxes: dict[str, SandboxStatus] = {}


# ── Routes ─────────────────────────────────────────────────

@router.post("/create", response_model=SandboxStatus)
async def create_sandbox(spec: SandboxSpec):
    """
    Create an isolated sandbox environment.
    
    In production, this creates a K8s pod with:
    - Resource quotas (CPU, memory, disk)
    - Network policies (egress allowlists)
    - Read-only root filesystem + writable /workspace
    - seccomp/AppArmor profiles
    - No privileged escalation
    """
    sandbox_id = f"sbx-{uuid.uuid4().hex[:12]}"
    pod_name = f"sandbox-{spec.agent_id}-{sandbox_id}"
    
    sandbox = SandboxStatus(
        sandbox_id=sandbox_id,
        task_id=spec.task_id,
        agent_id=spec.agent_id,
        status="running",
        runtime=spec.runtime,
        created_at=datetime.utcnow().isoformat(),
        started_at=datetime.utcnow().isoformat(),
        pod_name=pod_name,
        node_name="node-pool-agent-01",
        resource_usage={
            "cpu_limit": spec.cpu_limit,
            "memory_limit": spec.memory_limit,
            "disk_limit": spec.disk_limit,
            "cpu_used": "0m",
            "memory_used": "0Mi",
            "network_policy": spec.network_policy,
            "egress_allowlist": spec.egress_allowlist,
            "timeout_seconds": spec.timeout_seconds,
        },
    )
    
    _sandboxes[sandbox_id] = sandbox
    return sandbox


@router.get("/{sandbox_id}", response_model=SandboxStatus)
async def get_sandbox(sandbox_id: str):
    """Get the current status of a sandbox."""
    if sandbox_id not in _sandboxes:
        raise HTTPException(status_code=404, detail="Sandbox not found")
    return _sandboxes[sandbox_id]


@router.post("/{sandbox_id}/exec", response_model=ExecResult)
async def exec_in_sandbox(sandbox_id: str, req: ExecRequest):
    """
    Execute a command inside the sandbox.
    
    The command runs with:
    - Non-root user (uid=1000)
    - No network access unless explicitly allowed
    - Resource limits enforced via cgroups
    - Timeout enforcement via SIGTERM → SIGKILL
    """
    if sandbox_id not in _sandboxes:
        raise HTTPException(status_code=404, detail="Sandbox not found")
    
    sandbox = _sandboxes[sandbox_id]
    if sandbox.status != "running":
        raise HTTPException(status_code=409, detail=f"Sandbox is {sandbox.status}, cannot exec")
    
    # Simulate command execution
    exec_id = f"exec-{uuid.uuid4().hex[:8]}"
    
    # Update resource usage
    sandbox.resource_usage["cpu_used"] = "120m"
    sandbox.resource_usage["memory_used"] = "256Mi"
    
    return ExecResult(
        exec_id=exec_id,
        sandbox_id=sandbox_id,
        command=req.command,
        exit_code=0,
        stdout=f"[sandbox:{sandbox_id}] Command executed successfully",
        stderr="",
        duration_ms=1250,
        resource_snapshot={
            "cpu_used_ms": 1200,
            "memory_peak_mb": 256,
            "disk_written_kb": 48,
            "network_egress_bytes": 0,
        },
    )


@router.delete("/{sandbox_id}")
async def destroy_sandbox(sandbox_id: str):
    """
    Destroy a sandbox and clean up all resources.
    
    In production:
    - Deletes the K8s pod
    - Removes ephemeral volumes
    - Records resource usage metrics
    - Emits sandbox.destroyed audit event
    """
    if sandbox_id not in _sandboxes:
        raise HTTPException(status_code=404, detail="Sandbox not found")
    
    sandbox = _sandboxes[sandbox_id]
    sandbox.status = "terminated"
    sandbox.finished_at = datetime.utcnow().isoformat()
    sandbox.exit_code = 0
    
    return {
        "sandbox_id": sandbox_id,
        "status": "terminated",
        "total_cpu_ms": 1200,
        "total_memory_peak_mb": 256,
        "total_duration_seconds": 45,
    }


@router.get("/{sandbox_id}/logs", response_model=list[SandboxLog])
async def get_sandbox_logs(sandbox_id: str, stream: Optional[str] = None, tail: int = 100):
    """
    Get logs from a sandbox.
    
    Supports filtering by stream (stdout, stderr, system)
    and tail-based pagination.
    """
    if sandbox_id not in _sandboxes:
        raise HTTPException(status_code=404, detail="Sandbox not found")
    
    logs = [
        SandboxLog(timestamp="2024-01-01T00:00:01Z", stream="system", message=f"Sandbox {sandbox_id} created"),
        SandboxLog(timestamp="2024-01-01T00:00:02Z", stream="system", message="Runtime python3.12 initialized"),
        SandboxLog(timestamp="2024-01-01T00:00:03Z", stream="system", message="Network policy applied: restricted"),
        SandboxLog(timestamp="2024-01-01T00:00:04Z", stream="stdout", message="Agent task execution started"),
        SandboxLog(timestamp="2024-01-01T00:00:05Z", stream="stdout", message="Processing input data..."),
        SandboxLog(timestamp="2024-01-01T00:00:10Z", stream="stdout", message="Task completed successfully"),
    ]
    
    if stream:
        logs = [l for l in logs if l.stream == stream]
    
    return logs[-tail:]
