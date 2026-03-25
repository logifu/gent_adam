"""Model Gateway — choke point #1 for ALL model inference.

Provides provider abstraction so workers specify task_type + model_policy,
never vendor-specific parameters. Enforces per-tenant quotas and cost tracking.
"""
