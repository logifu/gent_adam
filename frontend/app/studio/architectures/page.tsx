"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import Stepper from "@/components/Stepper";

/**
 * STU-004: Architecture Compare Screen
 *
 * Side-by-side comparison of architecture candidates.
 * Each candidate shows:
 * - Architecture pattern name
 * - Tradeoff radar (quality, latency, cost, safety, complexity)
 * - Component breakdown
 * - AI recommendation with confidence
 *
 * User selects a candidate to proceed to the Architecture Canvas (STU-005).
 */

const LIFECYCLE_STEPS = [
  { id: "brief", label: "Brief", description: "Goal & requirements", status: "completed" as const },
  { id: "design", label: "Design", description: "Architecture candidates", status: "completed" as const },
  { id: "compare", label: "Compare", description: "Side-by-side tradeoffs", status: "active" as const },
  { id: "evaluate", label: "Evaluate", description: "Benchmarks & safety", status: "upcoming" as const },
  { id: "approve", label: "Approve", description: "Governance sign-off", status: "upcoming" as const },
  { id: "deploy", label: "Deploy", description: "Release to production", status: "upcoming" as const },
];

interface ArchCandidate {
  id: string;
  name: string;
  pattern: string;
  description: string;
  scores: {
    quality: number;
    latency: number;
    cost: number;
    safety: number;
    complexity: number;
  };
  components: { name: string; type: string }[];
  estimatedCost: string;
  estimatedLatency: string;
  aiRecommendation: string;
  confidence: number;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

const CANDIDATES: ArchCandidate[] = [
  {
    id: "arch-001",
    name: "ReAct + RAG",
    pattern: "Retrieval-Augmented Reactive",
    description:
      "A ReAct (Reasoning + Action) architecture with retrieval-augmented generation. The agent reasons through steps, retrieves context from the knowledge base, and acts via tools — interleaving thinking with doing.",
    scores: { quality: 0.88, latency: 0.72, cost: 0.65, safety: 0.85, complexity: 0.6 },
    components: [
      { name: "Supervisor", type: "orchestrator" },
      { name: "ReAct Planner", type: "reasoning" },
      { name: "RAG Retriever", type: "knowledge" },
      { name: "Tool Executor", type: "execution" },
      { name: "Output Validator", type: "safety" },
    ],
    estimatedCost: "$2.50 / run",
    estimatedLatency: "~18s p95",
    aiRecommendation: "Best balance of quality and cost for standard complexity goals. Strong retrieval grounding reduces hallucination risk.",
    confidence: 0.94,
    pros: [
      "Strong grounding via RAG reduces hallucination",
      "Well-established pattern with extensive research",
      "Good balance of quality vs. cost",
      "Straightforward debugging via step traces",
    ],
    cons: [
      "Higher latency than direct approaches",
      "Retrieval quality depends on knowledge base",
      "May over-retrieve for simple queries",
    ],
    recommended: true,
  },
  {
    id: "arch-002",
    name: "Multi-Agent Swarm",
    pattern: "Collaborative Multi-Agent",
    description:
      "Multiple specialized sub-agents collaborate via a orchestrator. Each sub-agent owns a specific capability domain. The swarm orchestrator coordinates task distribution and result aggregation.",
    scores: { quality: 0.92, latency: 0.55, cost: 0.4, safety: 0.8, complexity: 0.85 },
    components: [
      { name: "Swarm Orchestrator", type: "orchestrator" },
      { name: "Research Agent", type: "reasoning" },
      { name: "Analysis Agent", type: "reasoning" },
      { name: "Writer Agent", type: "generation" },
      { name: "Validator Agent", type: "safety" },
      { name: "Knowledge Agent", type: "knowledge" },
    ],
    estimatedCost: "$6.80 / run",
    estimatedLatency: "~35s p95",
    aiRecommendation: "Highest quality potential, but significantly more complex and expensive. Best suited for high-stakes tasks where quality justifies cost.",
    confidence: 0.86,
    pros: [
      "Highest quality potential through specialization",
      "Each sub-agent can be independently improved",
      "Natural task parallelism for speed gains",
      "Clear separation of concerns",
    ],
    cons: [
      "Significantly higher cost (2.7x ReAct)",
      "Complex inter-agent communication patterns",
      "Harder to debug failures across agents",
      "Latency overhead from coordination",
    ],
    recommended: false,
  },
  {
    id: "arch-003",
    name: "Plan-and-Execute",
    pattern: "Sequential Planning",
    description:
      "A two-phase architecture: the planner generates a complete task pipeline upfront, then the executor runs each step sequentially. Simpler than ReAct but less adaptive to unexpected results.",
    scores: { quality: 0.75, latency: 0.85, cost: 0.8, safety: 0.78, complexity: 0.35 },
    components: [
      { name: "Full Planner", type: "reasoning" },
      { name: "Step Executor", type: "execution" },
      { name: "Context Loader", type: "knowledge" },
      { name: "Output Formatter", type: "generation" },
    ],
    estimatedCost: "$1.20 / run",
    estimatedLatency: "~10s p95",
    aiRecommendation: "Simplest architecture with lowest cost. Good for well-defined, predictable tasks but struggles with ambiguous or multi-step reasoning goals.",
    confidence: 0.79,
    pros: [
      "Simplest to implement and maintain",
      "Lowest cost per run",
      "Fastest execution path",
      "Predictable resource consumption",
    ],
    cons: [
      "Cannot adapt mid-execution to new information",
      "Lower quality on complex, ambiguous tasks",
      "No iterative refinement loop",
      "Brittle with unexpected edge cases",
    ],
    recommended: false,
  },
];

const SCORE_LABELS: { key: keyof ArchCandidate["scores"]; label: string; icon: string }[] = [
  { key: "quality", label: "Quality", icon: "⭐" },
  { key: "latency", label: "Latency", icon: "⚡" },
  { key: "cost", label: "Cost Eff.", icon: "💰" },
  { key: "safety", label: "Safety", icon: "🛡️" },
  { key: "complexity", label: "Simplicity", icon: "🧩" },
];

export default function ArchitectureComparePage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>("arch-001");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  function handleProceed() {
    if (!selectedId) return;
    router.push(`/studio/architectures/${selectedId}`);
  }

  return (
    <AppShell
      title="Architecture Compare"
      breadcrumbs={[
        { label: "Studio", href: "/studio/new" },
        { label: "Brief", href: "/studio/brief" },
      ]}
      actions={
        <button
          className="btn btn-primary"
          onClick={handleProceed}
          disabled={!selectedId}
          style={{
            opacity: selectedId ? 1 : 0.5,
          }}
        >
          Select & Continue →
        </button>
      }
    >
      <div className="studio-layout">
        {/* ── Left Panel: Lifecycle ──────────────────────── */}
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
            Candidates
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {CANDIDATES.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`nav-item ${selectedId === c.id ? "active" : ""}`}
                style={{
                  border: "none",
                  background: selectedId === c.id ? "var(--brand-light)" : "none",
                }}
              >
                <span style={{ fontSize: 14 }}>
                  {c.recommended ? "⭐" : "📐"}
                </span>
                <span style={{ fontSize: 13 }}>{c.name}</span>
              </button>
            ))}
          </div>

          {/* AI Recommendation */}
          <div
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-3)",
              background: "#E8F5E9",
              borderRadius: "var(--radius-sm)",
              borderLeft: "3px solid var(--state-success)",
            }}
          >
            <div
              style={{
                fontWeight: 500,
                fontSize: 12,
                color: "var(--state-success)",
                marginBottom: 4,
              }}
            >
              💡 AI Recommendation
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              <strong>ReAct + RAG</strong> is the best fit for your goal and
              risk profile. 94% confidence.
            </div>
          </div>
        </div>

        {/* ── Center Panel: Side-by-Side Candidates ──────── */}
        <div className="studio-center">
          {/* Comparison Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${CANDIDATES.length}, 1fr)`,
              gap: "var(--space-4)",
              marginBottom: "var(--space-4)",
            }}
          >
            {CANDIDATES.map((candidate) => {
              const isSelected = selectedId === candidate.id;
              const isExpanded = expandedId === candidate.id;

              return (
                <div
                  key={candidate.id}
                  className="card"
                  onClick={() => handleSelect(candidate.id)}
                  style={{
                    cursor: "pointer",
                    border: isSelected
                      ? "2px solid var(--brand-primary)"
                      : "1px solid var(--border-default)",
                    background: isSelected
                      ? "var(--brand-light)"
                      : "var(--bg-surface)",
                    position: "relative",
                  }}
                >
                  {/* Recommended badge */}
                  {candidate.recommended && (
                    <div
                      style={{
                        position: "absolute",
                        top: -1,
                        right: -1,
                        background: "var(--state-success)",
                        color: "white",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "0 var(--radius-md) 0 var(--radius-sm)",
                      }}
                    >
                      RECOMMENDED
                    </div>
                  )}

                  {/* Header */}
                  <h3
                    className="type-heading-2"
                    style={{ marginBottom: 4 }}
                  >
                    {candidate.name}
                  </h3>
                  <div
                    className="chip chip-neutral"
                    style={{ marginBottom: "var(--space-3)" }}
                  >
                    {candidate.pattern}
                  </div>

                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {candidate.description}
                  </p>

                  {/* Score Bars */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {SCORE_LABELS.map((s) => (
                      <div
                        key={s.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                        }}
                      >
                        <span style={{ fontSize: 12, width: 20 }}>{s.icon}</span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-secondary)",
                            width: 60,
                          }}
                        >
                          {s.label}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            background: "var(--bg-subtle)",
                          }}
                        >
                          <div
                            style={{
                              width: `${candidate.scores[s.key] * 100}%`,
                              height: "100%",
                              borderRadius: 3,
                              background:
                                candidate.scores[s.key] > 0.8
                                  ? "var(--state-success)"
                                  : candidate.scores[s.key] > 0.6
                                  ? "var(--brand-primary)"
                                  : "var(--state-warning)",
                              transition: "width var(--motion-standard)",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            width: 30,
                            textAlign: "right",
                          }}
                        >
                          {Math.round(candidate.scores[s.key] * 100)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Cost & Latency */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "var(--space-2)",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    <div
                      style={{
                        padding: "var(--space-2)",
                        background: "var(--bg-subtle)",
                        borderRadius: "var(--radius-sm)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Cost
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {candidate.estimatedCost}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "var(--space-2)",
                        background: "var(--bg-subtle)",
                        borderRadius: "var(--radius-sm)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Latency
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {candidate.estimatedLatency}
                      </div>
                    </div>
                  </div>

                  {/* Components */}
                  <div style={{ marginBottom: "var(--space-3)" }}>
                    <div
                      className="type-label"
                      style={{
                        color: "var(--text-muted)",
                        marginBottom: "var(--space-1)",
                      }}
                    >
                      Components ({candidate.components.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {candidate.components.map((comp) => (
                        <span
                          key={comp.name}
                          className="chip chip-neutral"
                          style={{ fontSize: 11 }}
                        >
                          {comp.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expand/Collapse Pros & Cons */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : candidate.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--brand-primary)",
                      fontSize: 12,
                      fontWeight: 500,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                        transition: "transform var(--motion-fast)",
                        display: "inline-block",
                      }}
                    >
                      ▶
                    </span>
                    {isExpanded ? "Hide Details" : "Show Pros & Cons"}
                  </button>

                  {isExpanded && (
                    <div style={{ marginTop: "var(--space-3)" }}>
                      <div style={{ marginBottom: "var(--space-3)" }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--state-success)",
                            marginBottom: 4,
                          }}
                        >
                          ✓ Pros
                        </div>
                        {candidate.pros.map((p, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                              lineHeight: 1.5,
                              paddingLeft: 12,
                            }}
                          >
                            • {p}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--state-error)",
                            marginBottom: 4,
                          }}
                        >
                          ✗ Cons
                        </div>
                        {candidate.cons.map((c, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                              lineHeight: 1.5,
                              paddingLeft: 12,
                            }}
                          >
                            • {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <h3
              className="type-heading-2"
              style={{ marginBottom: "var(--space-3)" }}
            >
              Summary Comparison
            </h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {CANDIDATES.map((c) => (
                    <th key={c.id}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 500 }}>Estimated Cost</td>
                  {CANDIDATES.map((c) => (
                    <td key={c.id}>{c.estimatedCost}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>P95 Latency</td>
                  {CANDIDATES.map((c) => (
                    <td key={c.id}>{c.estimatedLatency}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Components</td>
                  {CANDIDATES.map((c) => (
                    <td key={c.id}>{c.components.length}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Quality Score</td>
                  {CANDIDATES.map((c) => (
                    <td
                      key={c.id}
                      style={{
                        fontWeight: 600,
                        color:
                          c.scores.quality > 0.85
                            ? "var(--state-success)"
                            : "var(--text-primary)",
                      }}
                    >
                      {Math.round(c.scores.quality * 100)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Safety Score</td>
                  {CANDIDATES.map((c) => (
                    <td key={c.id}>{Math.round(c.scores.safety * 100)}%</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>AI Confidence</td>
                  {CANDIDATES.map((c) => (
                    <td
                      key={c.id}
                      style={{
                        fontWeight: 600,
                        color:
                          c.confidence > 0.9
                            ? "var(--state-success)"
                            : "var(--text-primary)",
                      }}
                    >
                      {Math.round(c.confidence * 100)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Panel: Selected Candidate Detail ─────── */}
        <div className="studio-right">
          {selectedId && (() => {
            const selected = CANDIDATES.find((c) => c.id === selectedId);
            if (!selected) return null;

            return (
              <>
                <h3
                  className="type-label"
                  style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}
                >
                  Selected Architecture
                </h3>

                <div
                  style={{
                    padding: "var(--space-3)",
                    background: "var(--brand-light)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "var(--space-4)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 16, color: "var(--brand-primary)" }}>
                    {selected.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    {selected.pattern}
                  </div>
                </div>

                {/* AI Recommendation */}
                <div
                  style={{
                    padding: "var(--space-3)",
                    background: "#E8EEFB",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--brand-primary)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <div
                    style={{ fontWeight: 500, fontSize: 12, color: "var(--brand-primary)", marginBottom: 4 }}
                  >
                    💡 AI Analysis
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {selected.aiRecommendation}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      marginTop: "var(--space-2)",
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
                          width: `${selected.confidence * 100}%`,
                          height: "100%",
                          borderRadius: 2,
                          background: "var(--brand-primary)",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>
                      {Math.round(selected.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Component Architecture */}
                <h3
                  className="type-label"
                  style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}
                >
                  Components
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  {selected.components.map((comp) => (
                    <div
                      key={comp.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--space-2)",
                        background: "var(--bg-subtle)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{comp.name}</span>
                      <span className="chip chip-neutral" style={{ fontSize: 10 }}>
                        {comp.type}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div
                  style={{
                    paddingTop: "var(--space-4)",
                    borderTop: "1px solid var(--border-default)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleProceed}
                  >
                    Open in Canvas →
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Request New Candidate
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </AppShell>
  );
}
