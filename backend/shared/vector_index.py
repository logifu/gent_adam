"""
Vector Index Configuration

Configures pgvector extension for semantic search:
- IVFFlat and HNSW index creation
- Embedding dimensions configuration
- Similarity search functions
- Index maintenance utilities
"""

from sqlalchemy import text
from typing import Optional
import logging

logger = logging.getLogger(__name__)


# ── Index Configuration ────────────────────────────────────

EMBEDDING_DIMENSIONS = {
    "text-embedding-3-large": 3072,
    "text-embedding-3-small": 1536,
    "text-embedding-ada-002": 1536,
    "voyage-3": 1024,
}

DEFAULT_EMBEDDING_MODEL = "text-embedding-3-large"
DEFAULT_DIMENSIONS = EMBEDDING_DIMENSIONS[DEFAULT_EMBEDDING_MODEL]


# ── SQL for pgvector setup ─────────────────────────────────

SETUP_PGVECTOR = """
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge schema if not exists
CREATE SCHEMA IF NOT EXISTS knowledge;

-- Knowledge documents table
CREATE TABLE IF NOT EXISTS knowledge.documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- 'document_set', 'database', 'api_feed', 'web_crawl'
    source_name VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,  -- SHA-256
    metadata JSONB DEFAULT '{}',
    chunk_index INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings table with vector column
CREATE TABLE IF NOT EXISTS knowledge.embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge.documents(document_id) ON DELETE CASCADE,
    embedding vector({dimensions}),
    model_name VARCHAR(100) NOT NULL DEFAULT '{model}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create IVFFlat index for approximate nearest neighbor search
-- Good for datasets < 1M vectors, faster build time
CREATE INDEX IF NOT EXISTS idx_embeddings_ivfflat
    ON knowledge.embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = {ivf_lists});

-- Create HNSW index for higher recall
-- Better for larger datasets, slower build but faster queries
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
    ON knowledge.embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_documents_agent ON knowledge.documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_documents_source ON knowledge.documents(source_type, source_name);
CREATE INDEX IF NOT EXISTS idx_embeddings_document ON knowledge.embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON knowledge.embeddings(model_name);
"""

# ── Search Functions ───────────────────────────────────────

SIMILARITY_SEARCH_SQL = """
SELECT
    d.document_id,
    d.title,
    d.content,
    d.source_name,
    d.metadata,
    1 - (e.embedding <=> :query_embedding::vector) AS similarity
FROM knowledge.embeddings e
JOIN knowledge.documents d ON d.document_id = e.document_id
WHERE d.agent_id = :agent_id
    AND e.model_name = :model_name
    AND 1 - (e.embedding <=> :query_embedding::vector) >= :threshold
ORDER BY e.embedding <=> :query_embedding::vector
LIMIT :top_k;
"""

HYBRID_SEARCH_SQL = """
-- Hybrid search: combine semantic similarity with full-text matching
WITH semantic AS (
    SELECT
        d.document_id,
        1 - (e.embedding <=> :query_embedding::vector) AS semantic_score
    FROM knowledge.embeddings e
    JOIN knowledge.documents d ON d.document_id = e.document_id
    WHERE d.agent_id = :agent_id
    ORDER BY e.embedding <=> :query_embedding::vector
    LIMIT :top_k * 2
),
lexical AS (
    SELECT
        d.document_id,
        ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', :query_text)) AS text_score
    FROM knowledge.documents d
    WHERE d.agent_id = :agent_id
        AND to_tsvector('english', d.content) @@ plainto_tsquery('english', :query_text)
    LIMIT :top_k * 2
)
SELECT
    COALESCE(s.document_id, l.document_id) AS document_id,
    d.title,
    d.content,
    d.source_name,
    COALESCE(s.semantic_score, 0) AS semantic_score,
    COALESCE(l.text_score, 0) AS text_score,
    (0.7 * COALESCE(s.semantic_score, 0) + 0.3 * COALESCE(l.text_score, 0)) AS combined_score
FROM semantic s
FULL OUTER JOIN lexical l ON s.document_id = l.document_id
JOIN knowledge.documents d ON d.document_id = COALESCE(s.document_id, l.document_id)
ORDER BY combined_score DESC
LIMIT :top_k;
"""


async def setup_vector_index(
    engine,
    model: str = DEFAULT_EMBEDDING_MODEL,
    ivf_lists: int = 100,
):
    """
    Initialize pgvector tables and indexes.

    Args:
        engine: SQLAlchemy async engine
        model: Embedding model name (determines vector dimensions)
        ivf_lists: Number of IVFFlat lists (sqrt of expected row count)
    """
    dimensions = EMBEDDING_DIMENSIONS.get(model, DEFAULT_DIMENSIONS)

    sql = SETUP_PGVECTOR.format(
        dimensions=dimensions,
        model=model,
        ivf_lists=ivf_lists,
    )

    async with engine.begin() as conn:
        for statement in sql.split(";"):
            stmt = statement.strip()
            if stmt:
                await conn.execute(text(stmt))

    logger.info(
        "Vector index configured",
        extra={
            "model": model,
            "dimensions": dimensions,
            "ivf_lists": ivf_lists,
        },
    )


async def search_similar(
    engine,
    agent_id: str,
    query_embedding: list[float],
    top_k: int = 10,
    threshold: float = 0.75,
    model: str = DEFAULT_EMBEDDING_MODEL,
) -> list[dict]:
    """
    Perform similarity search using pgvector.

    Returns documents ranked by cosine similarity.
    """
    async with engine.connect() as conn:
        result = await conn.execute(
            text(SIMILARITY_SEARCH_SQL),
            {
                "agent_id": agent_id,
                "query_embedding": str(query_embedding),
                "model_name": model,
                "threshold": threshold,
                "top_k": top_k,
            },
        )
        return [dict(row._mapping) for row in result]


async def reindex(engine, agent_id: Optional[str] = None):
    """
    Rebuild vector indexes.

    Should be run after bulk inserts or when search quality degrades.
    """
    async with engine.begin() as conn:
        await conn.execute(text("REINDEX INDEX CONCURRENTLY knowledge.idx_embeddings_ivfflat"))
        await conn.execute(text("REINDEX INDEX CONCURRENTLY knowledge.idx_embeddings_hnsw"))
    logger.info("Vector indexes rebuilt", extra={"agent_id": agent_id})
