"""Shared Pydantic v2 schemas — contracts frozen before implementation."""

from shared.schemas.envelopes import ErrorDetail, ErrorEnvelope, RequestMeta, SuccessEnvelope
from shared.schemas.identity import AgentSpec, AgentVersion, RuntimeInstance, TokenClaims
from shared.schemas.runs import ExecutionBudget, RunSpec, RunStatus, RunState
from shared.schemas.plans import PlanSpec, TaskSpec, TaskDependency
from shared.schemas.tasks import TaskAttempt, TaskResult, AggregatedResult
from shared.schemas.tools import ToolCall, ToolGrant, ToolResult
from shared.schemas.knowledge import RetrievalRequest, RetrievalResult, SourceRecord
from shared.schemas.evaluation import EvaluationReport, ScenarioPack
from shared.schemas.audit import AuditEvent
from shared.schemas.events import EventEnvelope

__all__ = [
    # Envelopes
    "RequestMeta",
    "SuccessEnvelope",
    "ErrorEnvelope",
    "ErrorDetail",
    # Identity
    "AgentSpec",
    "AgentVersion",
    "RuntimeInstance",
    "TokenClaims",
    # Runs
    "RunSpec",
    "RunStatus",
    "RunState",
    "ExecutionBudget",
    # Plans
    "PlanSpec",
    "TaskSpec",
    "TaskDependency",
    # Tasks
    "TaskAttempt",
    "TaskResult",
    "AggregatedResult",
    # Tools
    "ToolCall",
    "ToolGrant",
    "ToolResult",
    # Knowledge
    "RetrievalRequest",
    "RetrievalResult",
    "SourceRecord",
    # Evaluation
    "EvaluationReport",
    "ScenarioPack",
    # Audit
    "AuditEvent",
    # Events
    "EventEnvelope",
]
