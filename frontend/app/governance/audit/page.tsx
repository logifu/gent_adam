"use client";

import AppShell from "@/components/AppShell";

/**
 * Audit Timeline Screen
 *
 * Chronological, filterable view of all audit events across the system.
 * Shows the hash-chained event record with verification status.
 */

interface AuditEvent {
  id: string;
  sequence: number;
  eventType: string;
  service: string;
  actor: string;
  action: string;
  resource: string;
  timestamp: string;
  hashVerified: boolean;
}

const MOCK_EVENTS: AuditEvent[] = [
  { id: "ae-001", sequence: 1047, eventType: "run.created", service: "supervisor", actor: "user@corp.com", action: "Create Run", resource: "run-001", timestamp: "14:32:01", hashVerified: true },
  { id: "ae-002", sequence: 1048, eventType: "plan.compiled", service: "planner", actor: "system", action: "Compile Plan", resource: "plan-001", timestamp: "14:32:02", hashVerified: true },
  { id: "ae-003", sequence: 1049, eventType: "policy.checked", service: "policy_enforcer", actor: "system", action: "Policy Check", resource: "tool:kb_search", timestamp: "14:32:03", hashVerified: true },
  { id: "ae-004", sequence: 1050, eventType: "task.dispatched", service: "swarm", actor: "system", action: "Dispatch Task", resource: "task-001", timestamp: "14:32:04", hashVerified: true },
  { id: "ae-005", sequence: 1051, eventType: "model.called", service: "model_gateway", actor: "system", action: "LLM Generate", resource: "gpt-4o", timestamp: "14:32:05", hashVerified: true },
  { id: "ae-006", sequence: 1052, eventType: "tool.called", service: "tool_broker", actor: "system", action: "Tool Execute", resource: "kb_search", timestamp: "14:32:07", hashVerified: true },
  { id: "ae-007", sequence: 1053, eventType: "model.called", service: "model_gateway", actor: "system", action: "LLM Generate", resource: "gpt-4o", timestamp: "14:32:09", hashVerified: true },
  { id: "ae-008", sequence: 1054, eventType: "task.completed", service: "swarm", actor: "system", action: "Task Complete", resource: "task-001", timestamp: "14:32:11", hashVerified: true },
  { id: "ae-009", sequence: 1055, eventType: "model.rate_limited", service: "model_gateway", actor: "system", action: "Rate Limit Hit", resource: "gpt-4o", timestamp: "14:32:12", hashVerified: true },
  { id: "ae-010", sequence: 1056, eventType: "model.fallback", service: "model_gateway", actor: "system", action: "Fallback to Mini", resource: "gpt-4o-mini", timestamp: "14:32:13", hashVerified: true },
  { id: "ae-011", sequence: 1057, eventType: "results.aggregated", service: "result_aggregator", actor: "system", action: "Aggregate Results", resource: "run-001", timestamp: "14:32:15", hashVerified: true },
  { id: "ae-012", sequence: 1058, eventType: "run.completed", service: "supervisor", actor: "system", action: "Run Complete", resource: "run-001", timestamp: "14:32:16", hashVerified: true },
];

const SERVICE_COLORS: Record<string, string> = {
  supervisor: "#8B5CF6", planner: "#3B82F6", swarm: "#EC4899", model_gateway: "#F59E0B",
  tool_broker: "#14B8A6", policy_enforcer: "#F97316", result_aggregator: "#6366F1",
};

const EVENT_ICONS: Record<string, string> = {
  "run.created": "🚀", "plan.compiled": "📋", "policy.checked": "🛡️", "task.dispatched": "📤",
  "model.called": "🤖", "tool.called": "🔧", "task.completed": "✅", "model.rate_limited": "⚠️",
  "model.fallback": "🔄", "results.aggregated": "📊", "run.completed": "🏁",
};

export default function AuditTimelinePage() {
  return (
    <AppShell
      title="Audit Timeline"
      breadcrumbs={[{ label: "Governance", href: "/governance" }, { label: "Audit" }]}
      actions={
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="btn btn-secondary">Export CSV</button>
          <button className="btn btn-primary">Verify Chain ✓</button>
        </div>
      }
    >
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div className="kpi-card"><div className="kpi-label">Total Events</div><div className="kpi-value">12,847</div></div>
        <div className="kpi-card"><div className="kpi-label">Chain Status</div><div className="kpi-value" style={{ color: "var(--state-success)" }}>✓ Valid</div></div>
        <div className="kpi-card"><div className="kpi-label">Last Verified</div><div className="kpi-value" style={{ fontSize: 16 }}>2 min ago</div></div>
        <div className="kpi-card"><div className="kpi-label">Services</div><div className="kpi-value">7</div></div>
      </div>

      {/* Timeline */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <h3 className="type-heading-2" style={{ marginBottom: "var(--space-4)" }}>Event Timeline</h3>
        <div style={{ position: "relative", paddingLeft: 40 }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 2, background: "var(--border-default)" }} />

          {MOCK_EVENTS.map((event, i) => (
            <div key={event.id} style={{ position: "relative", paddingBottom: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
              {/* Circle on timeline */}
              <div style={{ position: "absolute", left: -30, top: 4, width: 14, height: 14, borderRadius: "50%", background: SERVICE_COLORS[event.service] || "#999", border: "2px solid white", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              </div>

              {/* Event content */}
              <div style={{ flex: 1, padding: "var(--space-3)", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", borderLeft: `3px solid ${SERVICE_COLORS[event.service] || "#999"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span>{EVENT_ICONS[event.eventType] || "📝"}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{event.action}</span>
                    <span className="chip chip-neutral" style={{ fontSize: 10 }}>{event.service}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>#{event.sequence}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{event.timestamp}</span>
                    {event.hashVerified && <span style={{ fontSize: 10, color: "var(--state-success)" }}>🔒</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)", fontSize: 12, color: "var(--text-secondary)" }}>
                  <span>Event: <code style={{ fontSize: 11 }}>{event.eventType}</code></span>
                  <span>Resource: <code style={{ fontSize: 11 }}>{event.resource}</code></span>
                  <span>Actor: {event.actor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
