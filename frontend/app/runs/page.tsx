"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";

/**
 * Runs Explorer Screen (APP-003)
 *
 * Displays all agent runs with:
 * - Filterable table with state badges and cost/token metrics
 * - Live sparkline for active runs
 * - Quick actions (cancel, rerun, view details)
 */

interface RunEntry {
  id: string;
  agentName: string;
  objective: string;
  state: "planning" | "queued" | "running" | "awaiting_review" | "completed" | "failed" | "cancelled";
  initiator: string;
  cost: string;
  tokens: number;
  duration: string;
  startedAt: string;
}

const STATE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  planning: { bg: "#E8EEFB", color: "var(--brand-primary)", label: "Planning" },
  queued: { bg: "#F5F5F5", color: "var(--text-secondary)", label: "Queued" },
  running: { bg: "#E3F2FD", color: "var(--state-info)", label: "Running" },
  awaiting_review: { bg: "#FFF8E1", color: "var(--state-warning)", label: "Awaiting Review" },
  completed: { bg: "#E8F5E9", color: "var(--state-success)", label: "Completed" },
  failed: { bg: "#FFEBEE", color: "var(--state-error)", label: "Failed" },
  cancelled: { bg: "#F5F5F5", color: "var(--text-muted)", label: "Cancelled" },
};

const MOCK_RUNS: RunEntry[] = [
  { id: "run-001", agentName: "Customer Support Agent v1.2", objective: "Handle refund request for order ORD-7831", state: "completed", initiator: "auto-trigger", cost: "$1.85", tokens: 32000, duration: "12s", startedAt: "2 min ago" },
  { id: "run-002", agentName: "Data Analyst Agent v2.0", objective: "Analyze Q1 2026 revenue trends by region", state: "running", initiator: "analyst@corp.com", cost: "$3.20", tokens: 58000, duration: "45s", startedAt: "1 min ago" },
  { id: "run-003", agentName: "Code Reviewer Agent v1.0", objective: "Review PR #489 — Auth middleware refactor", state: "awaiting_review", initiator: "dev@corp.com", cost: "$2.10", tokens: 41000, duration: "28s", startedAt: "5 min ago" },
  { id: "run-004", agentName: "Research Assistant v1.1", objective: "Literature review on transformer efficiency", state: "failed", initiator: "researcher@corp.com", cost: "$4.50", tokens: 95000, duration: "2m 15s", startedAt: "12 min ago" },
  { id: "run-005", agentName: "Compliance Monitor v1.0", objective: "Audit access logs for policy violations", state: "completed", initiator: "compliance-cron", cost: "$0.90", tokens: 15000, duration: "8s", startedAt: "30 min ago" },
  { id: "run-006", agentName: "Customer Support Agent v1.2", objective: "Respond to billing inquiry #BIL-2901", state: "completed", initiator: "auto-trigger", cost: "$1.20", tokens: 21000, duration: "9s", startedAt: "45 min ago" },
  { id: "run-007", agentName: "Data Analyst Agent v2.0", objective: "Generate monthly KPI dashboard report", state: "queued", initiator: "scheduler", cost: "$0.00", tokens: 0, duration: "—", startedAt: "just now" },
  { id: "run-008", agentName: "Research Assistant v1.1", objective: "Summarize 15 new papers on RLHF", state: "planning", initiator: "researcher@corp.com", cost: "$0.10", tokens: 2000, duration: "2s", startedAt: "just now" },
];

export default function RunsExplorerPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = MOCK_RUNS.filter((r) => {
    if (filter !== "all" && r.state !== filter) return false;
    if (searchQuery && !r.objective.toLowerCase().includes(searchQuery.toLowerCase()) && !r.agentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: MOCK_RUNS.length,
    running: MOCK_RUNS.filter((r) => r.state === "running").length,
    completed: MOCK_RUNS.filter((r) => r.state === "completed").length,
    failed: MOCK_RUNS.filter((r) => r.state === "failed").length,
  };

  return (
    <AppShell
      title="Runs Explorer"
      breadcrumbs={[{ label: "Runs" }]}
      actions={
        <button className="btn btn-primary" onClick={() => router.push("/studio/new")}>
          + New Run
        </button>
      }
    >
      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* State filters */}
        {(["all", "running", "completed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="chip"
            style={{
              background: filter === f ? "var(--brand-primary)" : "var(--bg-subtle)",
              color: filter === f ? "white" : "var(--text-secondary)",
              cursor: "pointer",
              border: "none",
              transition: "all var(--motion-fast)",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f as keyof typeof counts] || 0})
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Search */}
        <input
          type="text"
          placeholder="Search runs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-default)",
            fontSize: 14,
            minWidth: 250,
            outline: "none",
          }}
        />
      </div>

      {/* KPI Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        {[
          { label: "Total Runs", value: "1,247", delta: "+23 today" },
          { label: "Active Now", value: String(counts.running), delta: "2 queued" },
          { label: "Avg Cost", value: "$2.40", delta: "−$0.30 vs last week" },
          { label: "Success Rate", value: "94.2%", delta: "+1.1% trend" },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div
              style={{
                fontSize: 11,
                color: "var(--state-success)",
                marginTop: 2,
              }}
            >
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Runs Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>State</th>
              <th>Agent</th>
              <th>Objective</th>
              <th>Cost</th>
              <th>Tokens</th>
              <th>Duration</th>
              <th>Started</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((run) => {
              const style = STATE_STYLES[run.state];
              return (
                <tr
                  key={run.id}
                  onClick={() => router.push(`/runs/${run.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 500,
                        background: style.bg,
                        color: style.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {run.state === "running" && (
                        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: style.color, marginRight: 4, animation: "pulse 1.5s infinite" }} />
                      )}
                      {style.label}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{run.agentName}</td>
                  <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "var(--text-secondary)" }}>{run.objective}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{run.cost}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{run.tokens.toLocaleString()}</td>
                  <td style={{ fontSize: 13 }}>{run.duration}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{run.startedAt}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={(e) => { e.stopPropagation(); router.push(`/runs/${run.id}`); }}
                      >
                        View
                      </button>
                      {run.state === "running" && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 11, padding: "2px 8px", color: "var(--state-error)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
