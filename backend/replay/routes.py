"""
Replay Service Routes

Replays historical traffic for regression testing.
Endpoints:
  POST /v1/replay/capture        — Record request/response pair
  POST /v1/replay/run            — Replay captured traffic against new version
  GET  /v1/replay/{session_id}   — Get replay session results
  GET  /v1/replay/sessions       — List replay sessions
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter(tags=["replay"])


# ── Schemas ────────────────────────────────────────────────

class CapturedInteraction(BaseModel):
    interaction_id: str = Field(default_factory=lambda: f"cap-{uuid.uuid4().hex[:8]}")
    run_id: str
    timestamp: str
    user_input: str
    agent_output: str
    tool_calls: list[dict] = Field(default_factory=list)
    model_used: str = "gpt-4o"
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    metadata: dict = Field(default_factory=dict)


class CaptureRequest(BaseModel):
    agent_id: str
    agent_version: str
    interactions: list[CapturedInteraction]
    source: str = Field(default="production", description="Where traffic was captured: production | staging")


class ReplayRequest(BaseModel):
    agent_id: str
    source_version: str = Field(..., description="Version traffic was captured from")
    target_version: str = Field(..., description="Version to replay against")
    capture_ids: list[str] = Field(default_factory=list, description="Specific captures to replay, or empty for all")
    comparison_mode: str = Field(default="semantic", description="semantic | exact | structural")
    max_interactions: int = Field(default=100, ge=1, le=10000)


class ReplayComparison(BaseModel):
    interaction_id: str
    user_input: str
    original_output: str
    replayed_output: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    structural_match: bool
    tool_calls_match: bool
    latency_diff_ms: int
    cost_diff: float
    regression_detected: bool
    diff_summary: Optional[str] = None


class ReplaySession(BaseModel):
    session_id: str
    agent_id: str
    source_version: str
    target_version: str
    status: str  # running | completed | failed
    started_at: str
    completed_at: Optional[str] = None
    total_interactions: int
    comparisons: list[ReplayComparison]
    summary: dict = Field(default_factory=dict)


# ── In-memory store ────────────────────────────────────────

_captures: dict[str, list[CapturedInteraction]] = {}
_sessions: dict[str, ReplaySession] = {}


# ── Routes ─────────────────────────────────────────────────

@router.post("/capture")
async def capture_traffic(req: CaptureRequest):
    """
    Record production request/response pairs for later replay.

    Captured interactions include:
    - User input and agent output
    - Tool calls made
    - Model used and token counts
    - Latency measurements
    """
    key = f"{req.agent_id}:{req.agent_version}"
    if key not in _captures:
        _captures[key] = []
    _captures[key].extend(req.interactions)

    return {
        "captured": len(req.interactions),
        "total_stored": len(_captures[key]),
        "agent_id": req.agent_id,
        "version": req.agent_version,
        "source": req.source,
    }


@router.post("/run", response_model=ReplaySession)
async def run_replay(req: ReplayRequest):
    """
    Replay captured traffic against a new agent version.

    Process:
    1. Load captured interactions from source version
    2. Send each input to the target version
    3. Compare outputs using the specified comparison mode
    4. Flag regressions (similarity < threshold, missing tool calls, etc.)
    5. Generate regression report
    """
    session_id = f"replay-{uuid.uuid4().hex[:12]}"

    # Simulate replay comparisons
    comparisons = []
    regression_count = 0

    sample_interactions = [
        ("How do I reset my password?", "To reset your password, go to Settings > Security > Reset Password.", "To reset your password: 1) Go to Settings 2) Click Security 3) Select Reset Password.", 0.92),
        ("What's the status of order #12345?", "Order #12345 is currently being shipped via FedEx.", "Order #12345 shipped via FedEx, expected delivery in 2 days.", 0.88),
        ("Cancel my subscription", "I'll process your cancellation right away.", "I can help with that. Your subscription will be cancelled at the end of the billing period.", 0.78),
        ("What are your pricing plans?", "We offer Basic ($10/mo), Pro ($25/mo), and Enterprise (custom).", "Our plans: Basic at $10/month, Pro at $25/month, and Enterprise with custom pricing.", 0.95),
        ("I found a bug in the API", "I'll create a ticket with our engineering team.", "I've logged this as a bug report. Can you share more details about the issue?", 0.72),
    ]

    for i, (input_text, original, replayed, similarity) in enumerate(sample_interactions):
        if i >= req.max_interactions:
            break
        is_regression = similarity < 0.80
        if is_regression:
            regression_count += 1

        comparisons.append(ReplayComparison(
            interaction_id=f"int-{uuid.uuid4().hex[:8]}",
            user_input=input_text,
            original_output=original,
            replayed_output=replayed,
            similarity_score=similarity,
            structural_match=similarity > 0.85,
            tool_calls_match=not is_regression,
            latency_diff_ms=(-50 + i * 30),
            cost_diff=round(-0.001 + i * 0.0005, 4),
            regression_detected=is_regression,
            diff_summary=f"Output tone shifted {'significantly' if is_regression else 'slightly'}" if similarity < 0.95 else None,
        ))

    session = ReplaySession(
        session_id=session_id,
        agent_id=req.agent_id,
        source_version=req.source_version,
        target_version=req.target_version,
        status="completed",
        started_at=datetime.utcnow().isoformat(),
        completed_at=datetime.utcnow().isoformat(),
        total_interactions=len(comparisons),
        comparisons=comparisons,
        summary={
            "total": len(comparisons),
            "regressions": regression_count,
            "regression_rate": round(regression_count / max(len(comparisons), 1), 3),
            "avg_similarity": round(sum(c.similarity_score for c in comparisons) / max(len(comparisons), 1), 3),
            "avg_latency_diff_ms": round(sum(c.latency_diff_ms for c in comparisons) / max(len(comparisons), 1)),
            "avg_cost_diff": round(sum(c.cost_diff for c in comparisons) / max(len(comparisons), 1), 4),
            "verdict": "PASS" if regression_count == 0 else "FAIL" if regression_count > len(comparisons) * 0.1 else "WARN",
        },
    )

    _sessions[session_id] = session
    return session


@router.get("/{session_id}", response_model=ReplaySession)
async def get_replay_session(session_id: str):
    """Get replay session results."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return _sessions[session_id]


@router.get("/sessions", response_model=list[dict])
async def list_sessions(agent_id: Optional[str] = None):
    """List all replay sessions, optionally filtered by agent."""
    results = []
    for session in _sessions.values():
        if agent_id and session.agent_id != agent_id:
            continue
        results.append({
            "session_id": session.session_id,
            "agent_id": session.agent_id,
            "source_version": session.source_version,
            "target_version": session.target_version,
            "status": session.status,
            "total_interactions": session.total_interactions,
            "verdict": session.summary.get("verdict", "UNKNOWN"),
            "started_at": session.started_at,
        })
    return results
