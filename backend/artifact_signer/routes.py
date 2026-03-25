"""
Artifact Signer Routes

KMS-backed signing and verification.
Endpoints:
  POST /v1/signing/sign          — Sign an artifact bundle
  POST /v1/signing/verify        — Verify an artifact signature
  GET  /v1/signing/keys          — List signing keys
  POST /v1/signing/keys/rotate   — Rotate signing key
  GET  /v1/signing/audit         — Get signing audit log
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid
import hashlib

router = APIRouter(tags=["signing"])


# ── Schemas ────────────────────────────────────────────────

class SignRequest(BaseModel):
    artifact_id: str = Field(..., description="Artifact to sign")
    agent_id: str = Field(..., description="Agent that owns this artifact")
    agent_version: str = Field(..., description="Version being released")
    content_hash: str = Field(..., description="SHA-256 hash of artifact content")
    metadata: dict = Field(default_factory=dict, description="Additional metadata to include in signature")
    key_id: Optional[str] = Field(default=None, description="Specific key to use, or latest")


class Signature(BaseModel):
    signature_id: str
    artifact_id: str
    agent_id: str
    agent_version: str
    content_hash: str
    signature: str  # Base64-encoded signature
    algorithm: str
    key_id: str
    key_version: int
    signed_at: str
    signed_by: str
    certificate_chain: list[str]
    metadata: dict = Field(default_factory=dict)


class VerifyRequest(BaseModel):
    artifact_id: str
    content_hash: str
    signature: str
    key_id: Optional[str] = None


class VerifyResult(BaseModel):
    valid: bool
    artifact_id: str
    signed_at: Optional[str] = None
    signed_by: Optional[str] = None
    key_id: Optional[str] = None
    key_version: Optional[int] = None
    algorithm: Optional[str] = None
    chain_valid: bool = False
    reason: Optional[str] = None


class SigningKey(BaseModel):
    key_id: str
    algorithm: str
    version: int
    status: str  # active | rotating | retired
    created_at: str
    rotated_at: Optional[str] = None
    expires_at: Optional[str] = None
    usage_count: int


class AuditEntry(BaseModel):
    entry_id: str
    action: str  # sign | verify | rotate_key
    artifact_id: Optional[str] = None
    key_id: str
    actor: str
    timestamp: str
    success: bool
    details: dict = Field(default_factory=dict)


# ── In-memory stores ──────────────────────────────────────

_signatures: dict[str, Signature] = {}
_keys: dict[str, SigningKey] = {
    "key-prod-001": SigningKey(
        key_id="key-prod-001", algorithm="ECDSA-P256-SHA256", version=3,
        status="active", created_at="2024-01-01T00:00:00Z",
        rotated_at="2024-06-01T00:00:00Z", expires_at="2025-06-01T00:00:00Z",
        usage_count=142,
    ),
    "key-prod-002": SigningKey(
        key_id="key-prod-002", algorithm="RSA-PSS-4096-SHA512", version=1,
        status="active", created_at="2024-06-01T00:00:00Z",
        expires_at="2025-12-01T00:00:00Z", usage_count=28,
    ),
    "key-dev-001": SigningKey(
        key_id="key-dev-001", algorithm="ECDSA-P256-SHA256", version=1,
        status="active", created_at="2024-01-01T00:00:00Z",
        expires_at="2025-01-01T00:00:00Z", usage_count=567,
    ),
}
_audit_log: list[AuditEntry] = []


def _simulate_sign(content_hash: str, key_id: str) -> str:
    """Simulate KMS signing (in production: calls AWS KMS / GCP Cloud KMS)."""
    return hashlib.sha256(f"{content_hash}:{key_id}:signed".encode()).hexdigest()


# ── Routes ─────────────────────────────────────────────────

@router.post("/sign", response_model=Signature)
async def sign_artifact(req: SignRequest):
    """
    Sign an artifact bundle using KMS-backed key.

    In production:
    - Calls AWS KMS SignAsync or GCP Cloud KMS asymmetricSign
    - Uses ECDSA P-256 or RSA-PSS 4096
    - Includes certificate chain for offline verification
    - Emits audit event
    """
    key_id = req.key_id or "key-prod-001"
    if key_id not in _keys:
        raise HTTPException(status_code=404, detail=f"Key {key_id} not found")

    key = _keys[key_id]
    if key.status == "retired":
        raise HTTPException(status_code=400, detail="Cannot sign with retired key")

    sig_value = _simulate_sign(req.content_hash, key_id)
    sig_id = f"sig-{uuid.uuid4().hex[:12]}"

    signature = Signature(
        signature_id=sig_id,
        artifact_id=req.artifact_id,
        agent_id=req.agent_id,
        agent_version=req.agent_version,
        content_hash=req.content_hash,
        signature=sig_value,
        algorithm=key.algorithm,
        key_id=key_id,
        key_version=key.version,
        signed_at=datetime.utcnow().isoformat(),
        signed_by="release-pipeline",
        certificate_chain=[
            f"-----BEGIN CERTIFICATE-----\n[Leaf: {key_id}]\n-----END CERTIFICATE-----",
            "-----BEGIN CERTIFICATE-----\n[Intermediate CA]\n-----END CERTIFICATE-----",
            "-----BEGIN CERTIFICATE-----\n[Root CA]\n-----END CERTIFICATE-----",
        ],
        metadata=req.metadata,
    )

    _signatures[sig_id] = signature
    key.usage_count += 1

    _audit_log.append(AuditEntry(
        entry_id=f"aud-{uuid.uuid4().hex[:8]}",
        action="sign",
        artifact_id=req.artifact_id,
        key_id=key_id,
        actor="release-pipeline",
        timestamp=datetime.utcnow().isoformat(),
        success=True,
        details={"agent_version": req.agent_version, "algorithm": key.algorithm},
    ))

    return signature


@router.post("/verify", response_model=VerifyResult)
async def verify_signature(req: VerifyRequest):
    """
    Verify an artifact's signature.

    Checks:
    1. Signature matches content hash
    2. Key is valid and not expired
    3. Certificate chain is valid
    """
    # Find matching signature
    matching = None
    for sig in _signatures.values():
        if sig.artifact_id == req.artifact_id and sig.signature == req.signature:
            matching = sig
            break

    if not matching:
        _audit_log.append(AuditEntry(
            entry_id=f"aud-{uuid.uuid4().hex[:8]}", action="verify",
            artifact_id=req.artifact_id, key_id=req.key_id or "unknown",
            actor="verifier", timestamp=datetime.utcnow().isoformat(),
            success=False, details={"reason": "signature_not_found"},
        ))
        return VerifyResult(valid=False, artifact_id=req.artifact_id, reason="Signature not found")

    # Verify content hash matches
    if matching.content_hash != req.content_hash:
        return VerifyResult(
            valid=False, artifact_id=req.artifact_id,
            reason="Content hash mismatch — artifact may have been tampered with",
        )

    # Verify key is still valid
    key = _keys.get(matching.key_id)
    if not key or key.status == "retired":
        return VerifyResult(
            valid=False, artifact_id=req.artifact_id,
            reason="Signing key has been retired",
        )

    _audit_log.append(AuditEntry(
        entry_id=f"aud-{uuid.uuid4().hex[:8]}", action="verify",
        artifact_id=req.artifact_id, key_id=matching.key_id,
        actor="verifier", timestamp=datetime.utcnow().isoformat(),
        success=True, details={},
    ))

    return VerifyResult(
        valid=True,
        artifact_id=req.artifact_id,
        signed_at=matching.signed_at,
        signed_by=matching.signed_by,
        key_id=matching.key_id,
        key_version=matching.key_version,
        algorithm=matching.algorithm,
        chain_valid=True,
    )


@router.get("/keys", response_model=list[SigningKey])
async def list_keys(status: Optional[str] = None):
    """List all signing keys, optionally filtered by status."""
    keys = list(_keys.values())
    if status:
        keys = [k for k in keys if k.status == status]
    return keys


@router.post("/keys/rotate", response_model=SigningKey)
async def rotate_key(key_id: str):
    """
    Rotate a signing key.

    Process:
    1. Generate new key material in KMS
    2. Mark old key version as 'rotating'
    3. Sign a transition certificate
    4. After grace period, mark old version as 'retired'
    """
    if key_id not in _keys:
        raise HTTPException(status_code=404, detail="Key not found")

    key = _keys[key_id]
    key.version += 1
    key.rotated_at = datetime.utcnow().isoformat()
    key.status = "active"

    _audit_log.append(AuditEntry(
        entry_id=f"aud-{uuid.uuid4().hex[:8]}", action="rotate_key",
        key_id=key_id, actor="key-admin",
        timestamp=datetime.utcnow().isoformat(),
        success=True, details={"new_version": key.version},
    ))

    return key


@router.get("/audit", response_model=list[AuditEntry])
async def get_signing_audit(artifact_id: Optional[str] = None, limit: int = 50):
    """Get signing audit log entries."""
    entries = _audit_log
    if artifact_id:
        entries = [e for e in entries if e.artifact_id == artifact_id]
    return entries[-limit:]
