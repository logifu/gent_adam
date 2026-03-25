"""
Replay Service

Replays historical traffic against new agent versions for regression testing:
- Capture production request/response pairs
- Replay against candidate versions
- Compare outputs (semantic similarity, structural diff)
- Generate regression reports
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager
from backend.shared.telemetry import setup_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_telemetry("replay")
    yield


app = FastAPI(
    title="Replay Service",
    description="Historical traffic replay for agent regression testing",
    version="0.1.0",
    lifespan=lifespan,
)

from backend.replay.routes import router  # noqa: E402

app.include_router(router, prefix="/v1/replay")
