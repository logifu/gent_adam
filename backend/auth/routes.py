"""
Auth Service — API Routes

Endpoints for OIDC-based authentication:
  POST /v1/auth/login             — Exchange OIDC code for session
  POST /v1/auth/refresh           — Refresh access token
  POST /v1/auth/logout            — Revoke session
  GET  /v1/auth/me                — Get current user info
  GET  /v1/auth/roles             — List available roles
  POST /v1/auth/roles/assign      — Assign role to user (admin only)
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth.dependencies import AuthUser, Role, get_current_user, require_role
from shared.schemas.envelopes import SuccessEnvelope

router = APIRouter()


# ── Request / Response Models ────────────────────────────

class LoginRequest(BaseModel):
    """Exchange OIDC authorization code for a session."""
    code: str
    redirect_uri: str
    state: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class RoleAssignRequest(BaseModel):
    user_id: str
    tenant_id: str
    role: str
    assigned_by: str


class SessionResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user_id: str
    tenant_id: str
    roles: list[str]


class UserInfoResponse(BaseModel):
    user_id: str
    tenant_id: str
    email: str | None
    name: str | None
    roles: list[str]
    token_type: str


# ── Auth Endpoints ───────────────────────────────────────

@router.post("/login")
async def login(request: LoginRequest):
    """
    Exchange OIDC authorization code for access + refresh tokens.

    Production flow:
    1. Receive auth code from Keycloak redirect
    2. Exchange code for tokens via Keycloak token endpoint
    3. Validate ID token, extract claims
    4. Create session, return access + refresh tokens
    """
    # TODO: Real OIDC code exchange with Keycloak
    return SuccessEnvelope(
        data=SessionResponse(
            access_token="dev_user01_tenant_dev_builder",
            refresh_token="refresh_dev_placeholder",
            token_type="Bearer",
            expires_in=1800,
            user_id="user01",
            tenant_id="tenant_dev",
            roles=["builder"],
        ),
        meta={"action": "session.created", "provider": "keycloak"},
    )


@router.post("/refresh")
async def refresh_token(request: RefreshRequest):
    """Refresh an expired access token using the refresh token."""
    # TODO: Real refresh token exchange with Keycloak
    return SuccessEnvelope(
        data=SessionResponse(
            access_token="dev_user01_tenant_dev_builder",
            refresh_token="refresh_dev_new_placeholder",
            token_type="Bearer",
            expires_in=1800,
            user_id="user01",
            tenant_id="tenant_dev",
            roles=["builder"],
        ),
        meta={"action": "session.refreshed"},
    )


@router.post("/logout")
async def logout(user: AuthUser = Depends(get_current_user)):
    """Revoke the current session and invalidate tokens."""
    # TODO: Revoke tokens via Keycloak admin API
    return SuccessEnvelope(
        data={"message": "Session revoked successfully"},
        meta={"action": "session.revoked", "user_id": user.user_id},
    )


@router.get("/me")
async def get_current_user_info(user: AuthUser = Depends(get_current_user)):
    """Get the current authenticated user's information."""
    return SuccessEnvelope(
        data=UserInfoResponse(
            user_id=user.user_id,
            tenant_id=user.tenant_id,
            email=user.email,
            name=user.name,
            roles=[r.value for r in user.roles],
            token_type=user.token_type,
        ),
    )


@router.get("/roles")
async def list_available_roles():
    """List all available RBAC roles and their descriptions."""
    return SuccessEnvelope(
        data=[
            {
                "role": "builder",
                "description": "Create and edit agents, run evaluations, manage knowledge base",
                "permissions": [
                    "agents:create", "agents:edit", "runs:create", "runs:view",
                    "evaluations:run", "knowledge:manage",
                ],
            },
            {
                "role": "operator",
                "description": "Deploy, monitor, and rollback agents in production",
                "permissions": [
                    "agents:deploy", "agents:rollback", "agents:monitor",
                    "runs:view", "incidents:manage",
                ],
            },
            {
                "role": "auditor",
                "description": "Read-only access to audit logs, governance records, and compliance",
                "permissions": [
                    "audit:read", "governance:read", "runs:view", "evaluations:view",
                ],
            },
            {
                "role": "admin",
                "description": "Full tenant administration — policies, users, billing, all operations",
                "permissions": [
                    "all:manage", "users:manage", "policies:manage",
                    "billing:manage", "tenant:configure",
                ],
            },
        ],
    )


@router.post("/roles/assign")
async def assign_role(
    request: RoleAssignRequest,
    admin: AuthUser = Depends(require_role("admin")),
):
    """
    Assign a role to a user. Requires admin role.

    In production:
    1. Validate the target user exists
    2. Validate the role is valid for the tenant
    3. Update Keycloak realm roles
    4. Emit audit event
    """
    return SuccessEnvelope(
        data={
            "user_id": request.user_id,
            "tenant_id": request.tenant_id,
            "role": request.role,
            "assigned_by": admin.user_id,
            "assigned_at": datetime.utcnow().isoformat(),
        },
        meta={"action": "role.assigned"},
    )
