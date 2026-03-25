"""
Sandbox Executor Service

Manages isolated execution environments for agent tasks:
- K8s pod creation with resource quotas
- Network policies (egress allowlists)
- File system isolation
- Execution timeout enforcement
- Resource usage monitoring (CPU, memory, disk)
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager
from backend.shared.telemetry import setup_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_telemetry("sandbox-executor")
    yield


app = FastAPI(
    title="Sandbox Executor",
    description="Isolated execution environments for agent tasks",
    version="0.1.0",
    lifespan=lifespan,
)

from backend.sandbox_executor.routes import router  # noqa: E402

app.include_router(router, prefix="/v1/sandbox")
