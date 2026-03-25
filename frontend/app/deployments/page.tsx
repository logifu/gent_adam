"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";

/**
 * DEP-001: Deployment Center Screen
 * 
 * Manages deployments across environments:
 * - Environment status overview (dev / staging / canary / production)
 * - Active releases with health metrics
 * - Promotion actions and rollback controls
 * - Canary traffic percentage and health monitoring
 */

interface Environment {
  name: string;
  status: "healthy" | "degraded" | "down" | "empty";
  agentVersion: string | null;
  releaseId: string | null;
  instances: number;
  uptime: string;
  errorRate: number;
  p95Latency: number;
  trafficPercent: number;
}

const ENVS: Environment[] = [
  { name: "Development", status: "healthy", agentVersion: "v1.3-dev", releaseId: "rel-dev-003", instances: 2, uptime: "99.9%", errorRate: 0.01, p95Latency: 1200, trafficPercent: 0 },
  { name: "Staging", status: "healthy", agentVersion: "v1.2.1", releaseId: "rel-stg-002", instances: 3, uptime: "99.95%", errorRate: 0.008, p95Latency: 1800, trafficPercent: 0 },
  { name: "Canary", status: "healthy", agentVersion: "v1.2.1", releaseId: "rel-can-001", instances: 1, uptime: "99.8%", errorRate: 0.02, p95Latency: 2100, trafficPercent: 10 },
  { name: "Production", status: "healthy", agentVersion: "v1.2.0", releaseId: "rel-prod-005", instances: 8, uptime: "99.99%", errorRate: 0.005, p95Latency: 1600, trafficPercent: 90 },
];

const ENV_COLORS: Record<string, string> = { Development: "#8B5CF6", Staging: "#F59E0B", Canary: "#3B82F6", Production: "#10B981" };
const STATUS_COLORS: Record<string, string> = { healthy: "var(--state-success)", degraded: "var(--state-warning)", down: "var(--state-error)", empty: "var(--text-muted)" };

interface Release {
  id: string;
  version: string;
  environment: string;
  status: "active" | "promoting" | "rolling_back" | "completed";
  promotedBy: string;
  promotedAt: string;
  evalScore: number;
  signed: boolean;
}

const RELEASES: Release[] = [
  { id: "rel-001", version: "v1.2.1", environment: "Canary", status: "active", promotedBy: "operator@corp.com", promotedAt: "2 hours ago", evalScore: 0.92, signed: true },
  { id: "rel-002", version: "v1.2.0", environment: "Production", status: "active", promotedBy: "release-bot", promotedAt: "3 days ago", evalScore: 0.89, signed: true },
  { id: "rel-003", version: "v1.1.0", environment: "Production", status: "completed", promotedBy: "release-bot", promotedAt: "2 weeks ago", evalScore: 0.87, signed: true },
];

export default function DeploymentCenterPage() {
  const [selectedRelease, setSelectedRelease] = useState<string>("rel-001");

  return (
    <AppShell
      title="Deployment Center"
      breadcrumbs={[{ label: "Deployments" }]}
      actions={
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="btn btn-secondary">Version Diff</button>
          <button className="btn btn-primary">+ New Release</button>
        </div>
      }
    >
      {/* Environment Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {ENVS.map((env) => (
          <div key={env.name} className="card" style={{ padding: "var(--space-4)", borderTop: `3px solid ${ENV_COLORS[env.name]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>{env.name}</h3>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: STATUS_COLORS[env.status] }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[env.status] }} />
                {env.status.charAt(0).toUpperCase() + env.status.slice(1)}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: "var(--space-2)", fontFamily: "var(--font-mono)" }}>{env.agentVersion || "—"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", fontSize: 12 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Instances</span><div style={{ fontWeight: 500 }}>{env.instances}</div></div>
              <div><span style={{ color: "var(--text-muted)" }}>Uptime</span><div style={{ fontWeight: 500 }}>{env.uptime}</div></div>
              <div><span style={{ color: "var(--text-muted)" }}>Error Rate</span><div style={{ fontWeight: 500, color: env.errorRate > 0.01 ? "var(--state-warning)" : "var(--state-success)" }}>{(env.errorRate * 100).toFixed(1)}%</div></div>
              <div><span style={{ color: "var(--text-muted)" }}>P95 Latency</span><div style={{ fontWeight: 500 }}>{env.p95Latency}ms</div></div>
            </div>
            {env.trafficPercent > 0 && (
              <div style={{ marginTop: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}><span>Traffic</span><span>{env.trafficPercent}%</span></div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--bg-subtle)" }}><div style={{ width: `${env.trafficPercent}%`, height: "100%", borderRadius: 2, background: ENV_COLORS[env.name] }} /></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Promotion Pipeline */}
      <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>Promotion Pipeline</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", padding: "var(--space-4)" }}>
          {["Development", "Staging", "Canary", "Production"].map((stage, i) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <div style={{ padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-sm)", background: ENV_COLORS[stage], color: "white", fontWeight: 600, fontSize: 13, textAlign: "center", minWidth: 110 }}>
                <div>{stage}</div>
                <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>{ENVS.find((e) => e.name === stage)?.agentVersion || "—"}</div>
              </div>
              {i < 3 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 30, height: 2, background: "var(--border-default)" }} />
                  <span style={{ fontSize: 16, color: "var(--text-muted)" }}>→</span>
                  <div style={{ width: 30, height: 2, background: "var(--border-default)" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Release History Table */}
      <div className="card" style={{ padding: "var(--space-4)", overflow: "hidden" }}>
        <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>Release History</h3>
        <table className="data-table">
          <thead>
            <tr><th>Version</th><th>Environment</th><th>Status</th><th>Eval Score</th><th>Signed</th><th>Promoted By</th><th>When</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {RELEASES.map((rel) => (
              <tr key={rel.id} onClick={() => setSelectedRelease(rel.id)} style={{ cursor: "pointer", background: selectedRelease === rel.id ? "var(--brand-light)" : undefined }}>
                <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{rel.version}</td>
                <td><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: ENV_COLORS[rel.environment] + "22", color: ENV_COLORS[rel.environment] }}>{rel.environment}</span></td>
                <td><span className={`chip ${rel.status === "active" ? "chip-success" : "chip-neutral"}`}>{rel.status}</span></td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{Math.round(rel.evalScore * 100)}%</td>
                <td>{rel.signed ? "🔒 Yes" : "🔓 No"}</td>
                <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{rel.promotedBy}</td>
                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{rel.promotedAt}</td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    {rel.status === "active" && rel.environment !== "Production" && (
                      <button className="btn btn-primary" style={{ fontSize: 11, padding: "2px 8px" }} onClick={(e) => e.stopPropagation()}>Promote →</button>
                    )}
                    {rel.status === "active" && (
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: "2px 8px", color: "var(--state-error)" }} onClick={(e) => e.stopPropagation()}>Rollback</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
