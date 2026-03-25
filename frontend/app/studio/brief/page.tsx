"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import AppShell from "@/components/AppShell";
import Stepper from "@/components/Stepper";

/**
 * STU-002: Brief Builder Screen
 *
 * The core three-panel studio layout:
 * Left:   Lifecycle stepper + section navigation
 * Center: Main artifact (the AI Brief being built)
 * Right:  AI Guidance panel with suggestions, evidence, confidence
 *
 * This is the workhorse screen for designing agents.
 * Progressive disclosure reveals complexity only when needed.
 */

const LIFECYCLE_STEPS = [
  { id: "brief", label: "Brief", description: "Goal & requirements", status: "active" as const },
  { id: "design", label: "Design", description: "Architecture candidates", status: "upcoming" as const },
  { id: "compare", label: "Compare", description: "Side-by-side tradeoffs", status: "upcoming" as const },
  { id: "evaluate", label: "Evaluate", description: "Benchmarks & safety", status: "upcoming" as const },
  { id: "approve", label: "Approve", description: "Governance sign-off", status: "upcoming" as const },
  { id: "deploy", label: "Deploy", description: "Release to production", status: "upcoming" as const },
];

const BRIEF_SECTIONS = [
  { id: "objective", label: "Objective", icon: "🎯" },
  { id: "context", label: "Context & Domain", icon: "📋" },
  { id: "capabilities", label: "Capabilities", icon: "⚡" },
  { id: "tools", label: "Tools Required", icon: "🔧" },
  { id: "constraints", label: "Constraints", icon: "🛡️" },
  { id: "success", label: "Success Criteria", icon: "✅" },
];

// AI-generated brief content based on the goal
interface BriefContent {
  objective: string;
  context: string;
  capabilities: string[];
  tools: { name: string; reason: string; granted: boolean }[];
  constraints: { category: string; value: string }[];
  successCriteria: string[];
}

// AI guidance suggestions
interface AiInsight {
  type: "suggestion" | "warning" | "info";
  title: string;
  message: string;
  confidence: number;
}

function BriefBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const objective = searchParams.get("objective") || "Design a new AI agent";
  const domain = searchParams.get("domain") || "General";
  const risk = searchParams.get("risk") || "standard";

  const [activeSection, setActiveSection] = useState("objective");
  const [editingField, setEditingField] = useState<string | null>(null);

  // Mock AI-generated brief (in production, comes from Planner service)
  const [brief] = useState<BriefContent>({
    objective: objective,
    context: `This agent operates in the ${domain} domain with a ${risk} risk profile. It will interact with users and backend systems to accomplish its goals within defined safety boundaries.`,
    capabilities: [
      "Natural language understanding and generation",
      "Knowledge base retrieval and synthesis",
      "Structured data extraction and formatting",
      "Multi-step reasoning with chain-of-thought",
      "Error detection and self-correction",
    ],
    tools: [
      { name: "Knowledge Base Search", reason: "Core retrieval capability", granted: true },
      { name: "SQL Database Query", reason: "Data access for analysis", granted: true },
      { name: "Web Search", reason: "Real-time information gathering", granted: false },
      { name: "Email Send", reason: "Notification delivery", granted: false },
      { name: "File System Access", reason: "Report generation and storage", granted: true },
    ],
    constraints: [
      { category: "Budget", value: "$10.00 max per run" },
      { category: "Tokens", value: "100,000 max per run" },
      { category: "Latency", value: "< 30 seconds per task" },
      { category: "Risk Profile", value: risk.charAt(0).toUpperCase() + risk.slice(1) },
      { category: "Data Sensitivity", value: "No PII in logs" },
    ],
    successCriteria: [
      "Achieves > 85% accuracy on benchmark test suite",
      "Responses within 30s for 95th percentile",
      "Zero critical safety violations in evaluation",
      "Cost per run under $10.00 budget ceiling",
      "Passes human review with > 80% approval rate",
    ],
  });

  // Mock AI guidance
  const [insights] = useState<AiInsight[]>([
    {
      type: "suggestion",
      title: "Consider Adding Guardrails",
      message: `For ${risk} risk domains, I recommend adding explicit output validation and human-in-the-loop checkpoints for sensitive operations.`,
      confidence: 0.92,
    },
    {
      type: "info",
      title: "Domain Knowledge Available",
      message: `Found 47 relevant documents in the ${domain} knowledge base. These will be used for retrieval during execution.`,
      confidence: 0.88,
    },
    {
      type: "warning",
      title: "Tool Permission Review",
      message: "Web Search and Email Send tools require governance approval for high-regulated deployments. Consider requesting pre-approval.",
      confidence: 0.76,
    },
    {
      type: "suggestion",
      title: "Architecture Recommendation",
      message: "Based on the goal complexity, I recommend a ReAct-style architecture with retrieval augmentation. Ready to generate candidates.",
      confidence: 0.94,
    },
  ]);

  function getInsightColor(type: AiInsight["type"]) {
    switch (type) {
      case "suggestion": return { bg: "#E8EEFB", border: "var(--brand-primary)", icon: "💡" };
      case "warning": return { bg: "#FFF8E1", border: "var(--state-warning)", icon: "⚠️" };
      case "info": return { bg: "#E3F2FD", border: "var(--state-info)", icon: "ℹ️" };
    }
  }

  return (
    <AppShell
      title="Brief Builder"
      breadcrumbs={[
        { label: "Studio", href: "/studio/new" },
        { label: "New Agent" },
      ]}
      actions={
        <button
          className="btn btn-primary"
          onClick={() => router.push("/studio/architectures")}
        >
          Generate Architectures →
        </button>
      }
    >
      {/* Three-Panel Studio Layout */}
      <div className="studio-layout">
        {/* ── Left Panel: Lifecycle + Sections ──────────── */}
        <div className="studio-left">
          <h3
            className="type-label"
            style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}
          >
            Lifecycle
          </h3>
          <Stepper steps={LIFECYCLE_STEPS} />

          <div
            style={{
              margin: "var(--space-4) 0",
              borderTop: "1px solid var(--border-default)",
            }}
          />

          <h3
            className="type-label"
            style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}
          >
            Brief Sections
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {BRIEF_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`nav-item ${activeSection === section.id ? "active" : ""}`}
                style={{ border: "none", background: activeSection === section.id ? "var(--brand-light)" : "none" }}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Center Panel: Main Brief Artifact ─────────── */}
        <div className="studio-center">
          {/* Objective Section */}
          <div
            className="card"
            style={{
              padding: "var(--space-5)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "var(--space-3)",
              }}
            >
              <h2 className="type-heading-1">🎯 Objective</h2>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={() => setEditingField(editingField === "objective" ? null : "objective")}
              >
                {editingField === "objective" ? "Done" : "Edit"}
              </button>
            </div>
            {editingField === "objective" ? (
              <textarea
                defaultValue={brief.objective}
                style={{
                  width: "100%",
                  minHeight: 80,
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--brand-primary)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            ) : (
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-primary)" }}>
                {brief.objective}
              </p>
            )}
          </div>

          {/* Context Section */}
          <div
            className="card"
            style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)" }}
          >
            <h2 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>
              📋 Context & Domain
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "var(--space-3)",
                marginBottom: "var(--space-3)",
              }}
            >
              <div className="kpi-card">
                <div className="kpi-label">Domain</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{domain}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Risk Profile</div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    marginTop: 4,
                    color:
                      risk === "high-regulated"
                        ? "var(--state-warning)"
                        : risk === "low"
                        ? "var(--state-success)"
                        : "var(--state-info)",
                  }}
                >
                  {risk}
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Knowledge Sources</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>47 docs</div>
              </div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)" }}>
              {brief.context}
            </p>
          </div>

          {/* Capabilities Section */}
          <div
            className="card"
            style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)" }}
          >
            <h2 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>
              ⚡ Capabilities
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {brief.capabilities.map((cap, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--bg-subtle)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--state-success)" }}>✓</span>
                  {cap}
                </div>
              ))}
            </div>
          </div>

          {/* Tools Section */}
          <div
            className="card"
            style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)" }}
          >
            <h2 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>
              🔧 Tools Required
            </h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {brief.tools.map((tool) => (
                  <tr key={tool.name}>
                    <td style={{ fontWeight: 500 }}>{tool.name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{tool.reason}</td>
                    <td>
                      <span
                        className={tool.granted ? "chip chip-success" : "chip chip-warning"}
                      >
                        {tool.granted ? "Granted" : "Needs Approval"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Constraints Section */}
          <div
            className="card"
            style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)" }}
          >
            <h2 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>
              🛡️ Constraints
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              {brief.constraints.map((c) => (
                <div
                  key={c.category}
                  style={{
                    padding: "var(--space-3)",
                    background: "var(--bg-subtle)",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--brand-primary)",
                  }}
                >
                  <div className="type-label" style={{ color: "var(--text-muted)", marginBottom: 4 }}>
                    {c.category}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Success Criteria Section */}
          <div
            className="card"
            style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)" }}
          >
            <h2 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>
              ✅ Success Criteria
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {brief.successCriteria.map((criteria, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: "2px solid var(--border-default)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      fontSize: 10,
                    }}
                  >
                    {i + 1}
                  </span>
                  {criteria}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel: AI Guidance ──────────────────── */}
        <div className="studio-right">
          <h3
            className="type-label"
            style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}
          >
            AI Guidance
          </h3>

          {/* Confidence Score */}
          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "var(--space-4)",
              textAlign: "center",
            }}
          >
            <div className="type-label" style={{ color: "var(--text-muted)", marginBottom: 4 }}>
              Brief Completeness
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--state-success)" }}>
              87%
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Ready for architecture generation
            </div>
          </div>

          {/* Insights */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {insights.map((insight, i) => {
              const style = getInsightColor(insight.type);
              return (
                <div
                  key={i}
                  style={{
                    padding: "var(--space-3)",
                    background: style.bg,
                    borderRadius: "var(--radius-sm)",
                    borderLeft: `3px solid ${style.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      marginBottom: 4,
                    }}
                  >
                    <span>{style.icon}</span>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>
                      {insight.title}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      marginBottom: 6,
                    }}
                  >
                    {insight.message}
                  </p>
                  {/* Confidence bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        background: "rgba(0,0,0,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: `${insight.confidence * 100}%`,
                          height: "100%",
                          borderRadius: 2,
                          background: style.border,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Sources */}
          <div
            style={{
              marginTop: "var(--space-4)",
              paddingTop: "var(--space-4)",
              borderTop: "1px solid var(--border-default)",
            }}
          >
            <h3
              className="type-label"
              style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}
            >
              Data Influences
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {[
                { label: "Knowledge Base", count: 47, icon: "📚" },
                { label: "Past Runs", count: 12, icon: "🔄" },
                { label: "Policy Rules", count: 5, icon: "📜" },
                { label: "Team Patterns", count: 8, icon: "🧬" },
              ].map((source) => (
                <div
                  key={source.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-2)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span>{source.icon}</span>
                    {source.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--brand-primary)",
                    }}
                  >
                    {source.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function BriefBuilderPage() {
  return (
    <Suspense fallback={<div>Loading brief...</div>}>
      <BriefBuilderContent />
    </Suspense>
  );
}
