"""
Simulation Service

Generates synthetic test scenarios for agent evaluation:
- Synthetic user inputs based on agent domain
- Edge-case generation (adversarial, boundary conditions)
- Multi-turn conversation simulation
- Load testing scenario generation
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager
from backend.shared.telemetry import setup_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_telemetry("simulation")
    yield


app = FastAPI(
    title="Simulation Service",
    description="Synthetic scenario generation for agent evaluation",
    version="0.1.0",
    lifespan=lifespan,
)

from backend.simulation.routes import router  # noqa: E402

app.include_router(router, prefix="/v1/simulations")
