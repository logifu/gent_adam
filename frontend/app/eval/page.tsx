"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";

/**
 * Evaluation Lab Screen (Phase 6 UI)
 *
 * Agent evaluation dashboard with:
 * - Evaluation suite management
 * - Results visualization with quality/safety/performance scores
 * - Historical comparison across versions
 * - Safety check results with pass/fail details
 */

interface EvalResult {
  id: string;
  agentVersion: string;
  suiteName: string;
  overallScore: number;
  verdict: "pass" | "fail" | "conditional";
  quality: { accuracy: number; relevance: number; consistency: number };
  safety: { toxicity: number; bias: number; hallucination: number; piiLeaks: number };
  performance: { p50: number; p95: number; p99: number };
  cost: { avgPerRun: number; withinBudget: boolean };
  completedAt: string;
}

const MOCK_RESULTS: EvalResult[] = [
  {
    id: "eval-001",
    agentVersion: "Customer Support v1.2",
    suiteName: "Safety Suite v2",
    overallScore: 0.92,
    verdict: "pass",
    quality: { accuracy: 0.89, relevance: 0.91, consistency: 0.83 },
    safety: { toxicity: 0.02, bias: 0.05, hallucination: 0.08, piiLeaks: 0 },
    performance: { p50: 850, p95: 2400, p99: 4100 },
    cost: { avgPerRun: 2.40, withinBudget: true },
    completedAt: "2 hours ago",
  },
  {
    id: "eval-002",
    agentVersion: "Data Analyst v2.0",
    suiteName: "Quality Standard",
    overallScore: 0.78,
    verdict: "conditional",
    quality: { accuracy: 0.76, relevance: 0.82, consistency: 0.71 },
    safety: { toxicity: 0.01, bias: 0.03, hallucination: 0.15, piiLeaks: 0 },
    performance: { p50: 1200, p95: 3800, p99: 6500 },
    cost: { avgPerRun: 4.80, withinBudget: true },
    completedAt: "5 hours ago",
  },
  {
    id: "eval-003",
    agentVersion: "Code Reviewer v1.0",
    suiteName: "Safety Suite v2",
    overallScore: 0.65,
    verdict: "fail",
    quality: { accuracy: 0.72, relevance: 0.68, consistency: 0.61 },
    safety: { toxicity: 0.12, bias: 0.08, hallucination: 0.22, piiLeaks: 2 },
    performance: { p50: 2100, p95: 5500, p99: 9200 },
    cost: { avgPerRun: 6.50, withinBudget: false },
    completedAt: "1 day ago",
  },
];

const VERDICT_STYLES = {
  pass: { bg: "#E8F5E9", color: "var(--state-success)", label: "✓ PASS" },
  fail: { bg: "#FFEBEE", color: "var(--state-error)", label: "✗ FAIL" },
  conditional: { bg: "#FFF8E1", color: "var(--state-warning)", label: "⚠ CONDITIONAL" },
};

function ScoreBar({ value, label, threshold = 0.8 }: { value: number; label: string; threshold?: number }) {
  const pct = Math.round(value * 100);
  const color = value >= threshold ? "var(--state-success)" : value >= 0.6 ? "var(--state-warning)" : "var(--state-error)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: 13 }}>
      <span style={{ width: 90, color: "var(--text-secondary)" }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--bg-subtle)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color, transition: "width var(--motion-standard)" }} />
      </div>
      <span style={{ width: 35, textAlign: "right", fontWeight: 500, fontFamily: "var(--font-mono)", color }}>{pct}%</span>
    </div>
  );
}

export default function EvalLabPage() {
  const [selectedEval, setSelectedEval] = useState<string>("eval-001");
  const selected = MOCK_RESULTS.find((r) => r.id === selectedEval) || MOCK_RESULTS[0];

  return (
    <AppShell
      title="Evaluation Lab"
      breadcrumbs={[{ label: "Evaluation" }]}
      actions={
        <button className="btn btn-primary">+ New Evaluation</button>
      }
    >
      <div className="studio-layout">
        {/* Left: Eval History */}
        <div className="studio-left">
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
            Recent Evaluations
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {MOCK_RESULTS.map((r) => {
              const v = VERDICT_STYLES[r.verdict];
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedEval(r.id)}
                  className={`nav-item ${selectedEval === r.id ? "active" : ""}`}
                  style={{ border: "none", background: selectedEval === r.id ? "var(--brand-light)" : "none", textAlign: "left" }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.agentVersion}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.suiteName} · {r.completedAt}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: v.bg, color: v.color }}>
                    {Math.round(r.overallScore * 100)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Suites */}
          <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-default)" }}>
            <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
              Evaluation Suites
            </h3>
            {["Safety Suite v2 (120 tests)", "Quality Standard (85 tests)", "Latency & Perf (50 tests)"].map((s) => (
              <div key={s} style={{ fontSize: 12, padding: "var(--space-1) 0", color: "var(--text-secondary)" }}>📋 {s}</div>
            ))}
          </div>
        </div>

        {/* Center: Results Detail */}
        <div className="studio-center">
          {/* Header */}
          <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 className="type-heading-1">{selected.agentVersion}</h2>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{selected.suiteName} · {selected.completedAt}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: VERDICT_STYLES[selected.verdict].color }}>
                  {Math.round(selected.overallScore * 100)}%
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12, background: VERDICT_STYLES[selected.verdict].bg, color: VERDICT_STYLES[selected.verdict].color }}>
                  {VERDICT_STYLES[selected.verdict].label}
                </span>
              </div>
            </div>
          </div>

          {/* Quality Scores */}
          <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>⭐ Quality Scores</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <ScoreBar value={selected.quality.accuracy} label="Accuracy" />
              <ScoreBar value={selected.quality.relevance} label="Relevance" />
              <ScoreBar value={selected.quality.consistency} label="Consistency" />
            </div>
          </div>

          {/* Safety Scores */}
          <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>🛡️ Safety Checks</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              {[
                { label: "Toxicity", value: selected.safety.toxicity, threshold: 0.05, invert: true },
                { label: "Bias", value: selected.safety.bias, threshold: 0.1, invert: true },
                { label: "Hallucination", value: selected.safety.hallucination, threshold: 0.1, invert: true },
                { label: "PII Leaks", value: selected.safety.piiLeaks, threshold: 0, isCount: true },
              ].map((check) => {
                const passed = check.isCount ? check.value === 0 : check.value <= check.threshold;
                return (
                  <div key={check.label} style={{ padding: "var(--space-3)", background: passed ? "#E8F5E9" : "#FFEBEE", borderRadius: "var(--radius-sm)", borderLeft: `3px solid ${passed ? "var(--state-success)" : "var(--state-error)"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{check.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: passed ? "var(--state-success)" : "var(--state-error)" }}>
                        {passed ? "✓ PASS" : "✗ FAIL"}
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: passed ? "var(--state-success)" : "var(--state-error)" }}>
                      {check.isCount ? check.value : `${(check.value * 100).toFixed(1)}%`}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Threshold: {check.isCount ? "0" : `≤${check.threshold * 100}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance */}
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>⚡ Performance</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "var(--space-3)" }}>
              {[
                { label: "P50 Latency", value: `${selected.performance.p50}ms`, ok: selected.performance.p50 < 2000 },
                { label: "P95 Latency", value: `${selected.performance.p95}ms`, ok: selected.performance.p95 < 5000 },
                { label: "P99 Latency", value: `${selected.performance.p99}ms`, ok: selected.performance.p99 < 10000 },
                { label: "Avg Cost/Run", value: `$${selected.cost.avgPerRun.toFixed(2)}`, ok: selected.cost.withinBudget },
              ].map((m) => (
                <div key={m.label} className="kpi-card" style={{ borderTop: `3px solid ${m.ok ? "var(--state-success)" : "var(--state-error)"}` }}>
                  <div className="kpi-label">{m.label}</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions + Comparison */}
        <div className="studio-right">
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
            Actions
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Re-run Evaluation</button>
            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Compare Versions</button>
            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Export Report</button>
          </div>

          <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-default)" }}>
            <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
              Version History
            </h3>
            {[
              { version: "v1.2", score: 92, trend: "+5%" },
              { version: "v1.1", score: 87, trend: "+3%" },
              { version: "v1.0", score: 84, trend: "—" },
            ].map((v) => (
              <div key={v.version} style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2)", fontSize: 12, borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontWeight: 500 }}>{v.version}</span>
                <span style={{ color: "var(--state-success)", fontWeight: 500 }}>{v.score}%</span>
                <span style={{ color: "var(--text-muted)" }}>{v.trend}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
