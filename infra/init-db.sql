-- Agent Architect Pro — PostgreSQL initialization
-- Creates extensions and schemas needed by the platform

-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create separate schemas for each plane (D5: Six-Plane Separation)
CREATE SCHEMA IF NOT EXISTS control;    -- Runs, plans, tasks
CREATE SCHEMA IF NOT EXISTS execution;  -- Workers, task attempts
CREATE SCHEMA IF NOT EXISTS knowledge;  -- Retrieval, artifacts, episodes
CREATE SCHEMA IF NOT EXISTS trust;      -- Identity, audit, policy
CREATE SCHEMA IF NOT EXISTS ops;        -- Metrics, logs (if needed)
