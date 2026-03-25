"""Supervisor Service — owns the run lifecycle state machine.

The Supervisor is the heart of the Control Plane. It:
- Creates runs from RunSpec via POST /v1/runs
- Manages the 7-state lifecycle (planning → completed/failed/cancelled)
- Delegates to Planner for Task DAG compilation
- Delegates to Swarm for task scheduling
- NEVER dispatches workers directly (D5: plane separation)
"""
