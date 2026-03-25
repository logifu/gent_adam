"""Knowledge Plane schemas — retrieval, sources, and semantic search."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RetrievalFilters(BaseModel):
    """Filtering options for knowledge retrieval."""

    tags: list[str] = Field(default_factory=list, description="Filter by metadata tags")
    freshness_days: int | None = Field(
        None, description="Only include sources updated within N days"
    )
    source_types: list[str] = Field(
        default_factory=list, description="Filter by source type"
    )


class RetrievalRequest(BaseModel):
    """Semantic search query — POST /v1/retrieve/search."""

    query: str = Field(..., min_length=1, description="Semantic search query")
    scope: list[str] = Field(
        default_factory=lambda: ["documents", "episodes", "artifacts"],
        description="Search domains: documents, episodes, artifacts",
    )
    filters: RetrievalFilters = Field(default_factory=RetrievalFilters)
    top_k: int = Field(8, ge=1, le=100, description="Number of results to return")


class SourceRecord(BaseModel):
    """A single search result with relevance score."""

    source_id: str = Field(..., description="Unique source identifier")
    title: str = Field(..., description="Human-readable source title")
    score: float = Field(..., ge=0.0, le=1.0, description="Relevance score")
    source_type: str = Field("document", description="Type: document, episode, artifact")
    snippet: str = Field("", description="Content preview")
    metadata: dict[str, str] = Field(default_factory=dict)


class RetrievalResult(BaseModel):
    """Search results from the Retrieval Service."""

    results: list[SourceRecord] = Field(default_factory=list, description="Ranked results")
    total_matches: int = Field(0, description="Total matching documents before top_k")
    query_latency_ms: int = Field(0, description="Search execution time")
