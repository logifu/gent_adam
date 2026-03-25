"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";

/**
 * GOV-001 + GOV-002: Governance Queue & Approval Packet
 *
 * Manages pending approvals for:
 * - Tool grant requests
 * - Deployment promotions
 * - Policy changes
 * - Budget increases
 */

interface ApprovalItem {
  id: string;
  type: "tool_grant" | "promotion" | "policy_change" | "budget_increase";
  title: string;
  requestor: string;
  agentName: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected" | "expired";
  submittedAt: string;
  evidence: string[];
  description: string;
}

const MOCK_ITEMS: ApprovalItem[] = [
  { id: "gov-001", type: "tool_grant", title: "Grant Web Search to Code Reviewer v1.0", requestor: "dev@corp.com", agentName: "Code Reviewer v1.0", riskLevel: "medium", status: "pending", submittedAt: "1 hour ago", evidence: ["Eval Report (92%)", "Safety Check Pass"], description: "Enable web search capability to allow the agent to lookup documentation and API references during code reviews." },
  { id: "gov-002", type: "promotion", title: "Promote Customer Support v1.2.1 to Production", requestor: "operator@corp.com", agentName: "Customer Support v1.2.1", riskLevel: "high", status: "pending", submittedAt: "2 hours ago", evidence: ["Eval Report (89%)", "Canary Health (99.8%)", "Safety Suite Pass", "KMS Signed"], description: "Promote from canary (10% traffic, 2h observation) to full production. All evaluation gates passed." },
  { id: "gov-003", type: "policy_change", title: "Increase Rate Limit for SQL Query Tool", requestor: "admin@corp.com", agentName: "Data Analyst v2.0", riskLevel: "medium", status: "pending", submittedAt: "3 hours ago", evidence: ["Usage Report", "Capacity Analysis"], description: "Increase SQL query rate limit from 50/hr to 100/hr to support batch analysis workloads." },
  { id: "gov-004", type: "budget_increase", title: "Raise Run Budget Cap to $100", requestor: "lead@corp.com", agentName: "Research Assistant v1.1", riskLevel: "critical", status: "pending", submittedAt: "5 hours ago", evidence: ["Cost Analysis", "ROI Justification"], description: "Increase per-run budget from $50 to $100 for complex multi-source research tasks requiring extensive model usage." },
  { id: "gov-005", type: "tool_grant", title: "Grant HTTP Request to Data Analyst v2.0", requestor: "dev@corp.com", agentName: "Data Analyst v2.0", riskLevel: "high", status: "approved", submittedAt: "1 day ago", evidence: ["Eval Report (87%)", "Security Review"], description: "Enable external API calls for data enrichment from approved third-party services." },
  { id: "gov-006", type: "promotion", title: "Promote Research Assistant v1.1 to Staging", requestor: "operator@corp.com", agentName: "Research Assistant v1.1", riskLevel: "low", status: "rejected", submittedAt: "2 days ago", evidence: ["Eval Report (65%)", "Safety FAIL"], description: "Promotion rejected — hallucination rate exceeded threshold (22% vs 10% max)." },
];

const TYPE_ICONS = { tool_grant: "🔧", promotion: "🚀", policy_change: "📋", budget_increase: "💰" };
const TYPE_LABELS = { tool_grant: "Tool Grant", promotion: "Promotion", policy_change: "Policy Change", budget_increase: "Budget" };
const RISK_STYLES: Record<string, { bg: string; color: string }> = {
  low: { bg: "#E8F5E9", color: "var(--state-success)" }, medium: { bg: "#FFF8E1", color: "var(--state-warning)" },
  high: { bg: "#FFF3E0", color: "#E65100" }, critical: { bg: "#FFEBEE", color: "var(--state-error)" },
};
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#FFF8E1", color: "var(--state-warning)", label: "⏳ Pending" },
  approved: { bg: "#E8F5E9", color: "var(--state-success)", label: "✓ Approved" },
  rejected: { bg: "#FFEBEE", color: "var(--state-error)", label: "✗ Rejected" },
  expired: { bg: "#F5F5F5", color: "var(--text-muted)", label: "⌛ Expired" },
};

export default function GovernancePage() {
  const [selectedItem, setSelectedItem] = useState<string>("gov-002");
  const [filter, setFilter] = useState<string>("pending");
  const detail = MOCK_ITEMS.find((i) => i.id === selectedItem);
  const filtered = filter === "all" ? MOCK_ITEMS : MOCK_ITEMS.filter((i) => i.status === filter);

  return (
    <AppShell
      title="Governance Queue"
      breadcrumbs={[{ label: "Governance" }]}
      actions={<span className="chip chip-info" style={{ fontWeight: 600 }}>🔔 {MOCK_ITEMS.filter((i) => i.status === "pending").length} Pending Approvals</span>}
    >
      <div className="studio-layout">
        {/* Left: Filter + Summary */}
        <div className="studio-left">
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Filter</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {(["pending", "approved", "rejected", "all"] as const).map((f) => {
              const count = f === "all" ? MOCK_ITEMS.length : MOCK_ITEMS.filter((i) => i.status === f).length;
              return (
                <button key={f} onClick={() => setFilter(f)} className={`nav-item ${filter === f ? "active" : ""}`} style={{ border: "none", background: filter === f ? "var(--brand-light)" : "none" }}>
                  <span>{f === "pending" ? "⏳" : f === "approved" ? "✓" : f === "rejected" ? "✗" : "📋"} {f.charAt(0).toUpperCase() + f.slice(1)} ({count})</span>
                </button>
              );
            })}
          </div>
          <div style={{ margin: "var(--space-4) 0", borderTop: "1px solid var(--border-default)" }} />
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>By Risk</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {(["critical", "high", "medium", "low"] as const).map((r) => {
              const count = MOCK_ITEMS.filter((i) => i.riskLevel === r && i.status === "pending").length;
              return (
                <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: RISK_STYLES[r].color }} />{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                  <span style={{ fontWeight: 600, color: count > 0 ? RISK_STYLES[r].color : "var(--text-muted)" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Queue Items */}
        <div className="studio-center">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {filtered.map((item) => {
              const risk = RISK_STYLES[item.riskLevel];
              const status = STATUS_STYLES[item.status];
              return (
                <div key={item.id} className="card" onClick={() => setSelectedItem(item.id)} style={{ padding: "var(--space-4)", cursor: "pointer", borderLeft: `4px solid ${risk.color}`, border: selectedItem === item.id ? `2px solid var(--brand-primary)` : undefined, borderLeftWidth: 4, borderLeftColor: risk.color }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <span style={{ fontSize: 18 }}>{TYPE_ICONS[item.type]}</span>
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</h3>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>by {item.requestor} · {item.submittedAt}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: status.bg, color: status.color, whiteSpace: "nowrap" }}>{status.label}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "var(--space-2)" }}>{item.description}</p>
                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: risk.bg, color: risk.color }}>{item.riskLevel.toUpperCase()} RISK</span>
                    <span className="chip chip-neutral" style={{ fontSize: 10 }}>{TYPE_LABELS[item.type]}</span>
                    {item.evidence.map((e, i) => <span key={i} className="chip chip-neutral" style={{ fontSize: 10 }}>📎 {e}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Approval Packet */}
        <div className="studio-right">
          {detail ? (
            <>
              <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Approval Packet</h3>
              <div style={{ padding: "var(--space-3)", background: RISK_STYLES[detail.riskLevel].bg, borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: RISK_STYLES[detail.riskLevel].color }}>{detail.riskLevel.toUpperCase()} RISK</div>
              </div>
              {[
                { label: "Request Type", value: TYPE_LABELS[detail.type] },
                { label: "Agent", value: detail.agentName },
                { label: "Requestor", value: detail.requestor },
                { label: "Submitted", value: detail.submittedAt },
              ].map((i) => (
                <div key={i.label} style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2)", fontSize: 12, borderBottom: "1px solid var(--border-subtle)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{i.label}</span>
                  <span style={{ fontWeight: 500 }}>{i.value}</span>
                </div>
              ))}
              <h4 className="type-label" style={{ margin: "var(--space-4) 0 var(--space-2)", color: "var(--text-muted)" }}>Evidence</h4>
              {detail.evidence.map((e, i) => (
                <div key={i} style={{ padding: "var(--space-2)", fontSize: 12, background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", marginBottom: 4, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>📎 {e}</div>
              ))}
              {detail.status === "pending" && (
                <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", background: "var(--state-success)" }}>✓ Approve</button>
                  <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", color: "var(--state-error)" }}>✗ Reject</button>
                  <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>💬 Request More Info</button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-muted)" }}>Select an item</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
