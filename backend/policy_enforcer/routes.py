"""
Policy Enforcer — API Routes

  POST /v1/policies/check          — Check if action is permitted (fail-closed)
  GET  /v1/policies/bundles        — List tenant policy bundles
  POST /v1/policies/bundles        — Create / update a policy bundle
  POST /v1/policies/grants/check   — Validate a specific tool grant
"""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from shared.schemas.envelopes import SuccessEnvelope

router = APIRouter()


class PolicyCheckRequest(BaseModel):
    tenant_id: str
    actor_id: str
    action: str  # e.g., "tools:call", "model:generate", "run:create"
    resource_type: str  # e.g., "tool", "model", "run"
    resource_id: str
    context: dict | None = None  # Additional context for policy evaluation


class PolicyBundleRequest(BaseModel):
    tenant_id: str
    name: str
    description: str | None = None
    rules: list[dict]  # Policy rules in structured format


class GrantCheckRequest(BaseModel):
    tenant_id: str
    agent_version_id: str
    tool_name: str
    action: str = "execute"


class PolicyDecision(BaseModel):
    allowed: bool
    reason: str
    policy_bundle: str | None = None
    evaluated_rules: int
    decision_time_ms: float


# Default policy rules (applied when no tenant-specific bundle exists)
DEFAULT_RULES = [
    {"id": "deny-all-default", "action": "*", "effect": "deny", "priority": 0},
    {"id": "allow-read", "action": "*.read", "effect": "allow", "priority": 10},
    {"id": "allow-builder-create", "action": "runs:create", "role": "builder", "effect": "allow", "priority": 20},
    {"id": "rate-limit-model", "action": "model:generate", "rate_limit": 100, "window": "1h", "effect": "allow", "priority": 15},
    {"id": "budget-cap", "action": "run:execute", "max_cost_usd": 50.0, "effect": "allow", "priority": 15},
]


@router.post("/check")
async def check_policy(request: PolicyCheckRequest):
    """
    Check if an action is permitted under current policies.

    FAIL-CLOSED: If policy evaluation fails or no matching rule
    is found, the action is DENIED by default.
    """
    # Evaluate against rules (simplified — production uses OPA or Cedar)
    matched_rules = [
        r for r in DEFAULT_RULES
        if r["action"] == "*" or r["action"] == request.action
    ]

    # Find highest priority matching rule
    if matched_rules:
        best = max(matched_rules, key=lambda r: r.get("priority", 0))
        allowed = best["effect"] == "allow"
    else:
        # Fail-closed: no matching rule means deny
        allowed = False
        best = {"id": "fail-closed-default", "effect": "deny"}

    return SuccessEnvelope(
        data=PolicyDecision(
            allowed=allowed,
            reason=f"Rule '{best['id']}' — {best['effect']}",
            policy_bundle="default",
            evaluated_rules=len(matched_rules),
            decision_time_ms=0.8,
        ),
    )


@router.get("/bundles")
async def list_policy_bundles(tenant_id: str = "tenant_dev"):
    """List all policy bundles for a tenant."""
    return SuccessEnvelope(
        data=[
            {
                "bundle_id": "pb-default",
                "name": "Default Policy",
                "description": "Base policy bundle applied to all tenants",
                "rules_count": len(DEFAULT_RULES),
                "version": 1,
                "active": True,
                "updated_at": datetime.utcnow().isoformat(),
            },
        ],
        meta={"tenant_id": tenant_id},
    )


@router.post("/bundles")
async def create_policy_bundle(request: PolicyBundleRequest):
    """Create or update a policy bundle."""
    return SuccessEnvelope(
        data={
            "bundle_id": "pb-" + request.name.lower().replace(" ", "-"),
            "name": request.name,
            "rules_count": len(request.rules),
            "version": 1,
            "active": True,
            "created_at": datetime.utcnow().isoformat(),
        },
        meta={"action": "policy_bundle.created"},
    )


@router.post("/grants/check")
async def check_tool_grant(request: GrantCheckRequest):
    """
    Validate a specific tool grant for an agent version.

    Production flow:
    1. Look up tool_grants table for matching (agent_version_id, tool_name)
    2. Verify grant is not expired or revoked
    3. Check rate limits
    4. Return decision
    """
    # Stub: check against known tool grants
    granted_tools = ["Knowledge Base Search", "SQL Database Query", "File System Access"]

    is_granted = request.tool_name in granted_tools

    return SuccessEnvelope(
        data={
            "granted": is_granted,
            "tool_name": request.tool_name,
            "agent_version_id": request.agent_version_id,
            "reason": "Tool grant active" if is_granted else "No active grant found — requires governance approval",
            "expires_at": None,
            "rate_limit_remaining": 97 if is_granted else 0,
        },
    )
