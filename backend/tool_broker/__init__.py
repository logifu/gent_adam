"""Tool Broker — choke point #2 for ALL external tool/API calls.

Every single external action passes through here — no exceptions.
Handles credential brokering, audit logging, and policy gating.
"""
