"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * APP-001: Home Dashboard
 *
 * The entry point for all personas. Shows:
 * - Recent agents and active runs
 * - Pending approvals
 * - Release health alerts
 * - Quick actions
 *
 * Role-aware: Builder sees unfinished work first,
 * Operator sees incidents, Executive sees portfolio.
 */

// Navigation sections from the Information Architecture
const NAV_SECTIONS = [
  { id: "home", label: "Home", icon: "🏠", href: "/home", active: true },
  { id: "studio", label: "Studio", icon: "🎨", href: "/studio" },
  { id: "runs", label: "Runs", icon: "▶️", href: "/runs" },
  { id: "knowledge", label: "Knowledge", icon: "📚", href: "/knowledge" },
  { id: "deployments", label: "Deployments", icon: "🚀", href: "/deployments" },
  { id: "observability", label: "Observability", icon: "📊", href: "/observability" },
  { id: "governance", label: "Governance", icon: "🛡️", href: "/governance" },
  { id: "executive", label: "Executive", icon: "📈", href: "/executive" },
  { id: "settings", label: "Settings", icon: "⚙️", href: "/settings" },
];

// Mock data for dashboard
const RECENT_AGENTS = [
  {
    id: "agent_001",
    name: "Medical Research Analyst",
    state: "evaluating",
    domain: "Healthcare",
    updatedAt: "2 hours ago",
  },
  {
    id: "agent_002",
    name: "Financial Risk Assessor",
    state: "deployed",
    domain: "Finance",
    updatedAt: "1 day ago",
  },
  {
    id: "agent_003",
    name: "Code Review Assistant",
    state: "designing",
    domain: "Engineering",
    updatedAt: "3 hours ago",
  },
];

const ACTIVE_RUNS = [
  {
    runId: "run_abc123",
    objective: "Design a customer support triage agent",
    state: "running",
    progress: 65,
    cost: "$2.40",
  },
  {
    runId: "run_def456",
    objective: "Evaluate financial analyst v2.1 candidate",
    state: "awaiting_review",
    progress: 100,
    cost: "$8.20",
  },
];

function getStateChipClass(state: string) {
  switch (state) {
    case "deployed":
    case "completed":
      return "chip chip-success";
    case "evaluating":
    case "running":
      return "chip chip-info";
    case "designing":
    case "planning":
      return "chip chip-neutral";
    case "awaiting_review":
      return "chip chip-warning";
    case "failed":
      return "chip chip-error";
    default:
      return "chip chip-neutral";
  }
}

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-shell">
      {/* ── Sidebar Navigation ──────────────────────────── */}
      <aside className={`app-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div
          style={{
            padding: "var(--space-4)",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                background: "var(--brand-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              AA
            </div>
            {!sidebarCollapsed && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Agent Architect</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Pro</div>
              </div>
            )}
          </div>
        </div>

        <nav style={{ flex: 1, padding: "var(--space-2)", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_SECTIONS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${item.active ? "active" : ""}`}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            padding: "var(--space-3)",
            borderTop: "1px solid var(--border-default)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {sidebarCollapsed ? "→" : "← Collapse"}
        </button>
      </aside>

      {/* ── Main Content ────────────────────────────────── */}
      <main className="app-main">
        {/* Top Bar */}
        <header className="app-topbar">
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600 }}>Home</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "6px 12px" }}
              title="Command Palette (⌘K)"
            >
              ⌘K Search...
            </button>
            <span style={{ fontSize: 18, cursor: "pointer" }} title="Notifications">
              🔔
            </span>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="app-content">
          {/* Quick Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-5)",
            }}
          >
            <div>
              <h2 className="type-heading-1">Welcome back</h2>
              <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
                Here&apos;s what&apos;s happening across your agent portfolio.
              </p>
            </div>
            <Link href="/studio/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
              + Create Agent
            </Link>
          </div>

          {/* KPI Cards Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "var(--space-4)",
              marginBottom: "var(--space-5)",
            }}
          >
            <div className="kpi-card">
              <div className="kpi-label">Active Agents</div>
              <div className="kpi-value">12</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Running Now</div>
              <div className="kpi-value">3</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Pending Approvals</div>
              <div className="kpi-value" style={{ color: "var(--state-warning)" }}>2</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Release Health</div>
              <div className="kpi-value" style={{ color: "var(--state-success)" }}>98%</div>
            </div>
          </div>

          {/* Two-column layout: Recent Agents + Active Runs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--space-5)",
            }}
          >
            {/* Recent Agents */}
            <div>
              <h3
                className="type-heading-2"
                style={{ marginBottom: "var(--space-3)" }}
              >
                Recent Agents
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {RECENT_AGENTS.map((agent) => (
                  <div key={agent.id} className="card" style={{ cursor: "pointer" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>
                          {agent.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {agent.domain} · {agent.updatedAt}
                        </div>
                      </div>
                      <span className={getStateChipClass(agent.state)}>
                        {agent.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Runs */}
            <div>
              <h3
                className="type-heading-2"
                style={{ marginBottom: "var(--space-3)" }}
              >
                Active Runs
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {ACTIVE_RUNS.map((run) => (
                  <div key={run.runId} className="card" style={{ cursor: "pointer" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        {run.objective}
                      </div>
                      <span className={getStateChipClass(run.state)}>
                        {run.state}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      {/* Progress Bar */}
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: "var(--bg-subtle)",
                          marginRight: "var(--space-3)",
                        }}
                      >
                        <div
                          style={{
                            width: `${run.progress}%`,
                            height: "100%",
                            borderRadius: 2,
                            background:
                              run.state === "awaiting_review"
                                ? "var(--state-warning)"
                                : "var(--brand-primary)",
                            transition: "width var(--motion-standard)",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {run.cost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
