"""Planner Service — compiles goals into Task DAGs.

The Planner is a COMPILER, not a SCHEDULER.
It returns a plan (PlanSpec) but never places work on workers.
"""
