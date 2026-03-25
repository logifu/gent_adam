"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Stepper from "@/components/Stepper";

/**
 * STU-007: Tools Config Screen
 * 
 * Manages tool access and permissions for an agent version:
 * - Available tools catalog with categories
 * - Grant/revoke toggle per tool
 * - Rate limits, credential source, audit visibility
 * - Policy enforcement status
 */

const LIFECYCLE_STEPS = [
  { id: "brief", label: "Brief", description: "Goal & requirements", status: "completed" as const },
  { id: "design", label: "Design", description: "Architecture candidates", status: "completed" as const },
  { id: "compare", label: "Compare", description: "Side-by-side tradeoffs", status: "completed" as const },
  { id: "tools", label: "Tools", description: "Tool access config", status: "active" as const },
  { id: "memory", label: "Memory", description: "Knowledge & memory", status: "upcoming" as const },
  { id: "evaluate", label: "Evaluate", description: "Benchmarks & safety", status: "upcoming" as const },
];

interface ToolConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  granted: boolean;
  rateLimit: number;
  rateLimitWindow: string;
  credentialSource: string;
  riskLevel: "low" | "medium" | "high";
  lastUsed: string | null;
  callCount: number;
}

const TOOL_CATEGORIES = ["Data Access", "External APIs", "Code Execution", "Communication", "File System"];

const MOCK_TOOLS: ToolConfig[] = [
  { id: "t1", name: "Knowledge Base Search", category: "Data Access", description: "Semantic search across uploaded documents and knowledge base", granted: true, rateLimit: 100, rateLimitWindow: "1h", credentialSource: "built-in", riskLevel: "low", lastUsed: "2 min ago", callCount: 847 },
  { id: "t2", name: "SQL Database Query", category: "Data Access", description: "Execute read-only SQL queries against connected databases", granted: true, rateLimit: 50, rateLimitWindow: "1h", credentialSource: "vault:db-readonly", riskLevel: "medium", lastUsed: "15 min ago", callCount: 312 },
  { id: "t3", name: "Web Search", category: "External APIs", description: "Search the web for real-time information via Bing/Google API", granted: false, rateLimit: 20, rateLimitWindow: "1h", credentialSource: "vault:search-api", riskLevel: "medium", lastUsed: null, callCount: 0 },
  { id: "t4", name: "HTTP Request", category: "External APIs", description: "Make authenticated HTTP requests to allowlisted external APIs", granted: false, rateLimit: 30, rateLimitWindow: "1h", credentialSource: "vault:api-keys", riskLevel: "high", lastUsed: null, callCount: 0 },
  { id: "t5", name: "Python Sandbox", category: "Code Execution", description: "Execute Python code in an isolated sandbox environment", granted: true, rateLimit: 25, rateLimitWindow: "1h", credentialSource: "built-in", riskLevel: "high", lastUsed: "30 min ago", callCount: 156 },
  { id: "t6", name: "Email Send", category: "Communication", description: "Send transactional emails via configured SMTP gateway", granted: false, rateLimit: 10, rateLimitWindow: "1h", credentialSource: "vault:smtp", riskLevel: "high", lastUsed: null, callCount: 0 },
  { id: "t7", name: "Slack Notify", category: "Communication", description: "Post messages and alerts to configured Slack channels", granted: true, rateLimit: 50, rateLimitWindow: "1h", credentialSource: "vault:slack-bot", riskLevel: "low", lastUsed: "1 hour ago", callCount: 45 },
  { id: "t8", name: "File Read/Write", category: "File System", description: "Read and write files in the agent's scoped workspace directory", granted: true, rateLimit: 100, rateLimitWindow: "1h", credentialSource: "built-in", riskLevel: "low", lastUsed: "5 min ago", callCount: 923 },
  { id: "t9", name: "S3 Object Storage", category: "File System", description: "Read/write objects in configured S3-compatible buckets", granted: true, rateLimit: 50, rateLimitWindow: "1h", credentialSource: "vault:s3-creds", riskLevel: "medium", lastUsed: "20 min ago", callCount: 78 },
];

const RISK_COLORS = { low: "var(--state-success)", medium: "var(--state-warning)", high: "var(--state-error)" };

export default function ToolsConfigPage() {
  const [tools, setTools] = useState(MOCK_TOOLS);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTool, setSelectedTool] = useState<string | null>("t1");

  const filtered = selectedCategory === "all" ? tools : tools.filter((t) => t.category === selectedCategory);
  const detail = tools.find((t) => t.id === selectedTool);
  const grantedCount = tools.filter((t) => t.granted).length;

  function toggleGrant(id: string) {
    setTools((prev) => prev.map((t) => t.id === id ? { ...t, granted: !t.granted } : t));
  }

  return (
    <AppShell
      title="Tools Configuration"
      breadcrumbs={[{ label: "Studio", href: "/studio/new" }, { label: "Tools" }]}
      actions={<button className="btn btn-primary">Save Configuration →</button>}
    >
      <div className="studio-layout">
        {/* Left: Lifecycle + Categories */}
        <div className="studio-left">
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Lifecycle</h3>
          <Stepper steps={LIFECYCLE_STEPS} />
          <div style={{ margin: "var(--space-4) 0", borderTop: "1px solid var(--border-default)" }} />
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Categories</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button onClick={() => setSelectedCategory("all")} className={`nav-item ${selectedCategory === "all" ? "active" : ""}`} style={{ border: "none", background: selectedCategory === "all" ? "var(--brand-light)" : "none" }}>
              <span>📋</span><span>All Tools ({tools.length})</span>
            </button>
            {TOOL_CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`nav-item ${selectedCategory === cat ? "active" : ""}`} style={{ border: "none", background: selectedCategory === cat ? "var(--brand-light)" : "none" }}>
                <span>{cat === "Data Access" ? "🗄️" : cat === "External APIs" ? "🌐" : cat === "Code Execution" ? "💻" : cat === "Communication" ? "💬" : "📁"}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
          {/* Summary */}
          <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3)", background: "#E8F5E9", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--state-success)" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--state-success)" }}>Tool Grants</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--state-success)" }}>{grantedCount}/{tools.length}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>tools active</div>
          </div>
        </div>

        {/* Center: Tool List */}
        <div className="studio-center">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {filtered.map((tool) => (
              <div key={tool.id} className="card" onClick={() => setSelectedTool(tool.id)} style={{ padding: "var(--space-4)", cursor: "pointer", border: selectedTool === tool.id ? "2px solid var(--brand-primary)" : "1px solid var(--border-default)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>{tool.name}</h3>
                    <span className="chip chip-neutral" style={{ fontSize: 10 }}>{tool.category}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: tool.riskLevel === "low" ? "#E8F5E9" : tool.riskLevel === "medium" ? "#FFF8E1" : "#FFEBEE", color: RISK_COLORS[tool.riskLevel] }}>{tool.riskLevel.toUpperCase()}</span>
                  </div>
                  {/* Toggle */}
                  <button onClick={(e) => { e.stopPropagation(); toggleGrant(tool.id); }} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: tool.granted ? "var(--state-success)" : "var(--border-default)", position: "relative", transition: "background var(--motion-fast)" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: tool.granted ? 23 : 3, transition: "left var(--motion-fast)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "var(--space-2)" }}>{tool.description}</p>
                <div style={{ display: "flex", gap: "var(--space-4)", fontSize: 12, color: "var(--text-muted)" }}>
                  <span>Rate: {tool.rateLimit}/{tool.rateLimitWindow}</span>
                  <span>Calls: {tool.callCount.toLocaleString()}</span>
                  {tool.lastUsed && <span>Last: {tool.lastUsed}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Tool Detail */}
        <div className="studio-right">
          {detail ? (
            <>
              <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Tool Details</h3>
              <div style={{ padding: "var(--space-3)", background: detail.granted ? "#E8F5E9" : "#FFEBEE", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: detail.granted ? "var(--state-success)" : "var(--state-error)" }}>{detail.granted ? "✓ Granted" : "✗ Not Granted"}</div>
              </div>
              {[
                { label: "Category", value: detail.category },
                { label: "Risk Level", value: detail.riskLevel.toUpperCase() },
                { label: "Rate Limit", value: `${detail.rateLimit} / ${detail.rateLimitWindow}` },
                { label: "Credential Source", value: detail.credentialSource },
                { label: "Total Calls", value: detail.callCount.toLocaleString() },
                { label: "Last Used", value: detail.lastUsed || "Never" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2)", fontSize: 12, borderBottom: "1px solid var(--border-subtle)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                  <span style={{ fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
              {!detail.granted && (
                <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3)", background: "#FFF8E1", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--state-warning)" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--state-warning)", marginBottom: 4 }}>⚠ Governance Required</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>This tool requires governance approval before it can be granted. Submit an approval request from the Governance Queue.</div>
                </div>
              )}
              <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>{detail.granted ? "Revoke Access" : "Request Access"}</button>
                <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>View Audit Log</button>
              </div>
            </>
          ) : (
            <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-muted)" }}>Select a tool to view details</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
