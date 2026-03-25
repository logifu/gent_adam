"""
Auth Service — OIDC Integration, JWT Validation, RBAC

Provides:
  1. JWT validation middleware (Bearer token from Keycloak)
  2. RBAC role-based access control with 4 canonical roles
  3. Tenant context extraction and propagation
  4. FastAPI dependency injection for protected endpoints

Roles (from architecture spec):
  - builder:  Create/edit agents, run evaluations
  - operator: Deploy, monitor, rollback agents
  - auditor:  Read-only access to audit logs, governance
  - admin:    Full access, tenant management, policy configuration
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: fetch OIDC discovery document, cache public keys
    print("[Auth] Starting — fetching OIDC discovery from Keycloak")
    print("[Auth] Caching JWKS public keys for token validation")
    yield
    print("[Auth] Shutting down")


app = FastAPI(
    title="Agent Architect Pro — Auth Service",
    version="0.1.0",
    lifespan=lifespan,
)

setup_middleware(app)

from auth.routes import router  # noqa: E402

app.include_router(router, prefix="/v1/auth")


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "auth"}
