"""Evaluation schemas — evidence-based release gates."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class EvalRecommendation(StrEnum):
    APPROVE = "approve"
    REVISE = "revise"
    BLOCK = "block"


class EvalFailure(BaseModel):
    """A single evaluation failure — for debugging, not blame."""

    scenario_id: str = Field(..., description="Which scenario failed")
    category: str = Field(..., description="Failure category")
    severity: str = Field("medium", description="low | medium | high | critical")
    message: str = Field(..., description="What happened")
    expected: str = Field("", description="Expected outcome")
    actual: str = Field("", description="Actual outcome")
    trace_ref: str | None = Field(None, description="Link to execution trace")


class EvaluationReport(BaseModel):
    """Candidate evaluation evidence — required for every release decision.

    No agent deploys to production without this report.
    """

    evaluation_id: str = Field(..., description="Unique evaluation identifier")
    candidate_id: str = Field(..., description="Agent version being evaluated")
    baseline_version: str | None = Field(None, description="Baseline for comparison")
    quality_score: float = Field(..., ge=0.0, le=1.0, description="Overall quality")
    safety_score: float = Field(..., ge=0.0, le=1.0, description="Safety assessment")
    cost_delta: str = Field("", description="Cost change vs baseline (e.g. '+12%')")
    latency_p95_ms: int = Field(0, description="95th percentile latency")
    scenario_coverage: float = Field(0.0, ge=0.0, le=1.0, description="Test coverage")
    recommendation: EvalRecommendation = Field(..., description="approve | revise | block")
    failures: list[EvalFailure] = Field(default_factory=list, description="Detailed failures")
    rationale: str = Field("", description="Human-readable reasoning for recommendation")
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    evaluated_by: str = Field("evaluation-service", description="Service/actor that ran eval")


class ScenarioPack(BaseModel):
    """Collection of test scenarios for evaluation."""

    pack_id: str = Field(..., description="Unique pack identifier")
    name: str = Field(..., description="Human-readable pack name")
    scenarios: list[dict[str, object]] = Field(
        default_factory=list, description="Individual test scenarios"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
