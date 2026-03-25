"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";

/**
 * STU-001: Goal Intake Screen
 *
 * The entry point for creating a new agent.
 * Natural language → structured intake.
 *
 * From UI/UX Spec:
 * - Single large text area for NL goal description
 * - AI extracts domain, constraints, required outputs
 * - Progressive disclosure: advanced options reveal on demand
 * - Quick-start templates for common agent types
 *
 * User Flow: Home → "Create Agent" → Goal Intake → Brief Builder
 */

const TEMPLATES = [
  {
    id: "customer-support",
    icon: "💬",
    title: "Customer Support Agent",
    description: "Triage and resolve support tickets using knowledge base",
    domain: "Support",
    sampleGoal:
      "Design an agent that triages incoming customer support tickets, searches the knowledge base for solutions, and drafts responses for human review.",
  },
  {
    id: "data-analyst",
    icon: "📊",
    title: "Data Analyst Agent",
    description: "Query databases, visualize trends, and generate reports",
    domain: "Analytics",
    sampleGoal:
      "Create an agent that connects to SQL databases, runs analytical queries, generates visualizations, and produces executive summary reports.",
  },
  {
    id: "code-reviewer",
    icon: "🔍",
    title: "Code Review Agent",
    description: "Review PRs for security, performance, and style issues",
    domain: "Engineering",
    sampleGoal:
      "Build an agent that reviews GitHub pull requests, checking for security vulnerabilities, performance issues, and adherence to coding standards.",
  },
  {
    id: "research-assistant",
    icon: "🔬",
    title: "Research Assistant",
    description: "Gather, synthesize, and summarize research materials",
    domain: "Research",
    sampleGoal:
      "Design an agent that searches academic papers and web sources, extracts key findings, identifies contradictions, and produces structured literature reviews.",
  },
  {
    id: "compliance-monitor",
    icon: "🛡️",
    title: "Compliance Monitor",
    description: "Monitor processes for regulatory compliance violations",
    domain: "Governance",
    sampleGoal:
      "Create an agent that continuously monitors business processes against regulatory requirements, flags potential violations, and generates compliance reports.",
  },
  {
    id: "blank",
    icon: "✨",
    title: "Start from Scratch",
    description: "Describe your agent's goal in your own words",
    domain: "",
    sampleGoal: "",
  },
];

const RISK_PROFILES = [
  {
    value: "low",
    label: "Low Risk",
    description: "Internal tools, non-critical workflows",
    color: "var(--state-success)",
  },
  {
    value: "standard",
    label: "Standard",
    description: "Customer-facing, moderate data sensitivity",
    color: "var(--state-info)",
  },
  {
    value: "high-regulated",
    label: "High / Regulated",
    description: "Financial, medical, legal, or PII-heavy domains",
    color: "var(--state-warning)",
  },
];

export default function GoalIntakePage() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [domain, setDomain] = useState("");
  const [riskProfile, setRiskProfile] = useState("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxCost, setMaxCost] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [requiredOutputs, setRequiredOutputs] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  function handleTemplateSelect(template: (typeof TEMPLATES)[number]) {
    setSelectedTemplate(template.id);
    if (template.sampleGoal) {
      setGoal(template.sampleGoal);
      setDomain(template.domain);
    }
  }

  async function handleProceed() {
    if (!goal.trim()) return;

    setIsProcessing(true);

    // Simulate AI processing the goal
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Navigate to Brief Builder with state
    // In production, this would call POST /v1/runs to create the run
    const params = new URLSearchParams({
      objective: goal,
      domain,
      risk: riskProfile,
    });
    router.push(`/studio/brief?${params.toString()}`);
  }

  const canProceed = goal.trim().length > 20;

  return (
    <AppShell
      title="Create New Agent"
      breadcrumbs={[{ label: "Studio", href: "/studio/new" }]}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <h2
            className="type-display-1"
            style={{ marginBottom: "var(--space-2)" }}
          >
            What should your agent do?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
            Describe the goal in natural language. Our AI will extract the
            requirements, suggest architectures, and guide you through the
            lifecycle.
          </p>
        </div>

        {/* Template Quick-Start Gallery */}
        <div style={{ marginBottom: "var(--space-5)" }}>
          <h3
            className="type-label"
            style={{
              marginBottom: "var(--space-3)",
              color: "var(--text-secondary)",
            }}
          >
            Quick Start Templates
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--space-3)",
            }}
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTemplateSelect(t)}
                className="card"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  border:
                    selectedTemplate === t.id
                      ? "2px solid var(--brand-primary)"
                      : "1px solid var(--border-default)",
                  background:
                    selectedTemplate === t.id
                      ? "var(--brand-light)"
                      : "var(--bg-surface)",
                  transition: "all var(--motion-fast)",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: "var(--space-2)" }}>
                  {t.icon}
                </div>
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  {t.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal Input */}
        <div
          className="card"
          style={{
            padding: "var(--space-5)",
            marginBottom: "var(--space-4)",
          }}
        >
          <label
            htmlFor="goal-input"
            style={{
              display: "block",
              fontWeight: 500,
              marginBottom: "var(--space-2)",
            }}
          >
            Agent Goal
          </label>
          <textarea
            id="goal-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe what your agent should accomplish. Be specific about inputs, outputs, tools it needs, and any constraints..."
            style={{
              width: "100%",
              minHeight: 140,
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              transition: "border-color var(--motion-fast)",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--brand-primary)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--border-default)")
            }
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "var(--space-2)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>{goal.length} characters</span>
            <span>{canProceed ? "✓ Ready" : "Min. 20 characters"}</span>
          </div>
        </div>

        {/* Domain & Risk Profile Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          {/* Domain */}
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <label
              htmlFor="domain-input"
              style={{
                display: "block",
                fontWeight: 500,
                marginBottom: "var(--space-2)",
                fontSize: 14,
              }}
            >
              Domain
            </label>
            <input
              id="domain-input"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., Healthcare, Finance, Engineering"
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {/* Risk Profile */}
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <label
              style={{
                display: "block",
                fontWeight: 500,
                marginBottom: "var(--space-2)",
                fontSize: 14,
              }}
            >
              Risk Profile
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {RISK_PROFILES.map((rp) => (
                <label
                  key={rp.value}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-2)",
                    cursor: "pointer",
                    padding: "var(--space-1) 0",
                  }}
                >
                  <input
                    type="radio"
                    name="risk"
                    value={rp.value}
                    checked={riskProfile === rp.value}
                    onChange={() => setRiskProfile(rp.value)}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        color: rp.color,
                      }}
                    >
                      {rp.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {rp.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Options (Progressive Disclosure) */}
        <div
          className="card"
          style={{
            padding: "var(--space-4)",
            marginBottom: "var(--space-5)",
          }}
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              color: "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 500,
              padding: 0,
              width: "100%",
            }}
          >
            <span
              style={{
                transform: showAdvanced ? "rotate(90deg)" : "rotate(0)",
                transition: "transform var(--motion-fast)",
                display: "inline-block",
              }}
            >
              ▶
            </span>
            Advanced Constraints
          </button>

          {showAdvanced && (
            <div
              style={{
                marginTop: "var(--space-4)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "var(--space-4)",
              }}
            >
              <div>
                <label
                  htmlFor="max-cost"
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Max Cost (USD)
                </label>
                <input
                  id="max-cost"
                  type="number"
                  value={maxCost}
                  onChange={(e) => setMaxCost(e.target.value)}
                  placeholder="e.g., 10.00"
                  style={{
                    width: "100%",
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-default)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="max-tokens"
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Max Tokens
                </label>
                <input
                  id="max-tokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  placeholder="e.g., 100000"
                  style={{
                    width: "100%",
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-default)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="required-outputs"
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Required Outputs
                </label>
                <input
                  id="required-outputs"
                  value={requiredOutputs}
                  onChange={(e) => setRequiredOutputs(e.target.value)}
                  placeholder="e.g., report, summary"
                  style={{
                    width: "100%",
                    padding: "var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-default)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-3)",
            padding: "var(--space-4) 0",
            borderTop: "1px solid var(--border-default)",
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={() => router.push("/")}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleProceed}
            disabled={!canProceed || isProcessing}
            style={{
              opacity: canProceed && !isProcessing ? 1 : 0.5,
              cursor: canProceed && !isProcessing ? "pointer" : "not-allowed",
              minWidth: 160,
            }}
          >
            {isProcessing ? (
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid white",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Analyzing Goal...
              </span>
            ) : (
              "Generate Brief →"
            )}
          </button>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AppShell>
  );
}
