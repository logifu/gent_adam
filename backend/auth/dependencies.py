"""
Auth Service — FastAPI Dependencies for JWT + RBAC

Provides injectable dependencies that protect endpoints:
  - get_current_user: Validates Bearer JWT, extracts user context
  - require_role: Factory that creates role-checking dependencies
  - TenantContext: Extracted from JWT claims for data isolation

Usage in other services:

    from auth.dependencies import get_current_user, require_role, AuthUser

    @router.get("/protected")
    async def protected(user: AuthUser = Depends(get_current_user)):
        return {"user_id": user.user_id, "tenant_id": user.tenant_id}

    @router.post("/admin-only")
    async def admin_only(user: AuthUser = Depends(require_role("admin"))):
        return {"message": "You are an admin"}
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)


class Role(str, Enum):
    """
    Four canonical RBAC roles from the architecture spec.
    Ordered by privilege level (lowest → highest).
    """
    BUILDER = "builder"
    OPERATOR = "operator"
    AUDITOR = "auditor"
    ADMIN = "admin"


# Role hierarchy — higher roles inherit lower role permissions
ROLE_HIERARCHY: dict[Role, set[Role]] = {
    Role.ADMIN: {Role.ADMIN, Role.OPERATOR, Role.BUILDER, Role.AUDITOR},
    Role.OPERATOR: {Role.OPERATOR, Role.BUILDER},
    Role.BUILDER: {Role.BUILDER},
    Role.AUDITOR: {Role.AUDITOR},
}


@dataclass
class AuthUser:
    """Authenticated user context extracted from JWT claims."""
    user_id: str
    tenant_id: str
    email: str | None = None
    name: str | None = None
    roles: list[Role] = field(default_factory=lambda: [Role.BUILDER])
    scopes: list[str] = field(default_factory=list)
    token_type: str = "user"  # "user" or "workload"

    def has_role(self, role: Role) -> bool:
        """Check if user has a role (considering hierarchy)."""
        for user_role in self.roles:
            if role in ROLE_HIERARCHY.get(user_role, set()):
                return True
        return False

    def has_scope(self, scope: str) -> bool:
        """Check if user's token includes a specific scope."""
        return scope in self.scopes


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AuthUser:
    """
    Validate the Bearer token and extract user context.

    In production, this will:
    1. Extract the Bearer token from Authorization header
    2. Validate signature against Keycloak JWKS
    3. Check expiry, audience, and issuer claims
    4. Extract user claims (sub, tenant_id, roles, email)
    5. Return AuthUser dataclass

    For development, accepts a stub token or falls back to defaults.
    """
    if credentials and credentials.credentials.startswith("aap."):
        # Workload token from Identity Service
        import base64
        import json
        try:
            payload = json.loads(
                base64.urlsafe_b64decode(
                    credentials.credentials[4:]  # strip "aap." prefix
                )
            )
            return AuthUser(
                user_id=payload.get("sub", "workload"),
                tenant_id=payload.get("tenant_id", "default"),
                roles=[Role.BUILDER],
                scopes=payload.get("scopes", []),
                token_type="workload",
            )
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid workload token")

    if credentials and credentials.credentials:
        # TODO: Real OIDC JWT validation with PyJWT / python-jose
        # For now, parse the token as a development stub:
        # Format: "dev_<user_id>_<tenant_id>_<role>"
        token = credentials.credentials
        if token.startswith("dev_"):
            parts = token.split("_", 3)
            if len(parts) >= 4:
                return AuthUser(
                    user_id=parts[1],
                    tenant_id=parts[2],
                    roles=[Role(parts[3])] if parts[3] in Role.__members__.values() else [Role.BUILDER],
                )

        # Accept any token in dev mode, extract from header if possible
        return AuthUser(
            user_id="dev-user",
            tenant_id=request.headers.get("X-Tenant-Id", "tenant_dev"),
            roles=[Role.BUILDER],
        )

    # No credentials — check for dev mode bypass
    tenant_id = request.headers.get("X-Tenant-Id", "tenant_dev")
    actor_id = request.headers.get("X-Actor-Id", "anonymous")

    return AuthUser(
        user_id=actor_id,
        tenant_id=tenant_id,
        roles=[Role.BUILDER],
    )


def require_role(*required_roles: str) -> Callable:
    """
    Factory that creates a FastAPI dependency requiring specific roles.

    Usage:
        @router.post("/deploy", dependencies=[Depends(require_role("operator", "admin"))])
        async def deploy_agent(...):
            ...
    """
    async def role_checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        for required in required_roles:
            try:
                role = Role(required)
            except ValueError:
                raise HTTPException(status_code=500, detail=f"Unknown role: {required}")

            if user.has_role(role):
                return user

        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN",
                "message": f"Requires one of roles: {', '.join(required_roles)}",
                "user_roles": [r.value for r in user.roles],
            },
        )

    return role_checker


def require_scope(scope: str) -> Callable:
    """
    Factory for scope-based authorization (workload tokens).

    Usage:
        @router.post("/tools/execute", dependencies=[Depends(require_scope("tools:call"))])
    """
    async def scope_checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if user.token_type == "user":
            return user  # User tokens have implicit access

        if not user.has_scope(scope):
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "SCOPE_DENIED",
                    "message": f"Token missing required scope: {scope}",
                    "granted_scopes": user.scopes,
                },
            )
        return user

    return scope_checker
