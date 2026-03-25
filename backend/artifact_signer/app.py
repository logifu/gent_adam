"""
Artifact Signer Service

KMS-backed cryptographic signing for agent artifacts:
- Sign agent version bundles before deployment
- Verify artifact signatures
- Certificate chain management
- Signing key rotation
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager
from backend.shared.telemetry import setup_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_telemetry("artifact-signer")
    yield


app = FastAPI(
    title="Artifact Signer",
    description="KMS-backed cryptographic artifact signing",
    version="0.1.0",
    lifespan=lifespan,
)

from backend.artifact_signer.routes import router  # noqa: E402

app.include_router(router, prefix="/v1/signing")
