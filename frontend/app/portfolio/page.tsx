"use client";

import AppShell from "@/components/AppShell";

/**
 * Executive Portfolio Screen
 *
 * High-level overview for executives showing:
 * - Agent fleet health and performance
 * - Cost trends and budgets
 * - Safety and compliance posture
 * - Deployment velocity metrics
 */

interface AgentSummary {
  name: string;
  version: string;
  status: "healthy" | "degraded" | "incident";
  runs24h: number;
  successRate: number;
  avgCost: number;
  safety: number;
}

const FLEET: AgentSummary[] = [
  { name: "Customer Support Agent", version: "v1.2.0", status: "healthy", runs24h: 342, successRate: 0.97, avgCost: 1.85, safety: 0.98 },
  { name: "Data Analyst Agent", version: "v2.0.0", status: "healthy", runs24h: 89, successRate: 0.92, avgCost: 4.20, safety: 0.95 },
  { name: "Code Reviewer Agent", version: "v1.0.0", status: "degraded", runs24h: 56, successRate: 0.78, avgCost: 2.10, safety: 0.82 },
  { name: "Research Assistant", version: "v1.1.0", status: "incident", runs24h: 12, successRate: 0.65, avgCost: 6.50, safety: 0.72 },
  { name: "Compliance Monitor", version: "v1.0.0", status: "healthy", runs24h: 24, successRate: 0.99, avgCost: 0.90, safety: 0.99 },
];

const STATUS_DOT = { healthy: "var(--state-success)", degraded: "var(--state-warning)", incident: "var(--state-error)" };

export default function PortfolioPage() {
  const totalRuns = FLEET.reduce((a, f) => a + f.runs24h, 0);
  const totalCost = FLEET.reduce((a, f) => a + f.avgCost * f.runs24h, 0);
  const avgSuccess = FLEET.reduce((a, f) => a + f.successRate, 0) / FLEET.length;
  const avgSafety = FLEET.reduce((a, f) => a + f.safety, 0) / FLEET.length;

  return (
    <AppShell
      title="Executive Portfolio"
      breadcrumbs={[{ label: "Portfolio" }]}
      actions={<button className="btn btn-secondary">Export Report</button>}
    >
      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div className="kpi-card"><div className="kpi-label">Active Agents</div><div className="kpi-value">{FLEET.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">Runs (24h)</div><div className="kpi-value">{totalRuns}</div></div>
        <div className="kpi-card"><div className="kpi-label">Total Cost (24h)</div><div className="kpi-value">${totalCost.toFixed(0)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Avg Success</div><div className="kpi-value" style={{ color: avgSuccess > 0.9 ? "var(--state-success)" : "var(--state-warning)" }}>{(avgSuccess * 100).toFixed(1)}%</div></div>
        <div className="kpi-card"><div className="kpi-label">Safety Posture</div><div className="kpi-value" style={{ color: avgSafety > 0.9 ? "var(--state-success)" : "var(--state-warning)" }}>{(avgSafety * 100).toFixed(1)}%</div></div>
        <div className="kpi-card"><div className="kpi-label">Incidents</div><div className="kpi-value" style={{ color: "var(--state-error)" }}>{FLEET.filter((f) => f.status === "incident").length}</div></div>
      </div>

      {/* Fleet Overview */}
      <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)", overflow: "hidden" }}>
        <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>Agent Fleet Health</h3>
        <table className="data-table">
          <thead>
            <tr><th>Agent</th><th>Version</th><th>Status</th><th>Runs (24h)</th><th>Success Rate</th><th>Avg Cost</th><th>Safety Score</th></tr>
          </thead>
          <tbody>
            {FLEET.map((agent) => (
              <tr key={agent.name}>
                <td style={{ fontWeight: 600 }}>{agent.name}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{agent.version}</td>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_DOT[agent.status] }} />
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                </td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{agent.runs24h}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <div style={{ width: 60, height: 6, borderRadius: 3, background: "var(--bg-subtle)" }}>
                      <div style={{ width: `${agent.successRate * 100}%`, height: "100%", borderRadius: 3, background: agent.successRate > 0.9 ? "var(--state-success)" : agent.successRate > 0.75 ? "var(--state-warning)" : "var(--state-error)" }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{(agent.successRate * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>${agent.avgCost.toFixed(2)}</td>
                <td>
                  <span style={{ fontWeight: 600, fontSize: 13, color: agent.safety > 0.9 ? "var(--state-success)" : agent.safety > 0.75 ? "var(--state-warning)" : "var(--state-error)" }}>
                    {(agent.safety * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost Trend + Safety Posture */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>💰 Cost Trend (7 Days)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-2)", height: 120 }}>
            {[420, 380, 450, 410, 390, 460, totalCost].map((val, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>${val.toFixed(0)}</span>
                <div style={{ width: "100%", height: `${(val / 500) * 100}%`, borderRadius: 4, background: i === 6 ? "var(--brand-primary)" : "var(--brand-light)", transition: "height var(--motion-standard)" }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)" }}>
          <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>🛡️ Compliance Summary</h3>
          {[
            { label: "Audit Chain Integrity", value: "Valid", icon: "🔒", ok: true },
            { label: "Safety Evaluations", value: "4/5 Pass", icon: "✓", ok: false },
            { label: "Policy Violations (30d)", value: "0", icon: "🛡️", ok: true },
            { label: "Pending Approvals", value: "4", icon: "⏳", ok: false },
            { label: "Expired Credentials", value: "0", icon: "🔑", ok: true },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: 13 }}><span>{item.icon}</span>{item.label}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: item.ok ? "var(--state-success)" : "var(--state-warning)" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
