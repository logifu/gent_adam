"use client";

import AppShell from "@/components/AppShell";

/**
 * DEP-003: Version Diff Screen
 * 
 * Side-by-side comparison of two agent versions
 * showing configuration, tool, memory, and performance differences.
 */

interface DiffItem {
  section: string;
  field: string;
  oldValue: string;
  newValue: string;
  changeType: "added" | "removed" | "modified";
}

const MOCK_DIFFS: DiffItem[] = [
  { section: "Architecture", field: "Pattern", oldValue: "ReAct + RAG", newValue: "ReAct + RAG", changeType: "modified" },
  { section: "Architecture", field: "Max Iterations", oldValue: "5", newValue: "8", changeType: "modified" },
  { section: "Model", field: "Primary Model", oldValue: "gpt-4o-2024-01", newValue: "gpt-4o-2024-03", changeType: "modified" },
  { section: "Model", field: "Fallback Model", oldValue: "—", newValue: "gpt-4o-mini", changeType: "added" },
  { section: "Model", field: "Temperature", oldValue: "0.7", newValue: "0.5", changeType: "modified" },
  { section: "Tools", field: "Web Search", oldValue: "Not Granted", newValue: "Granted (20/hr)", changeType: "added" },
  { section: "Tools", field: "Email Send", oldValue: "Granted (5/hr)", newValue: "—", changeType: "removed" },
  { section: "Memory", field: "Top-K", oldValue: "10", newValue: "15", changeType: "modified" },
  { section: "Memory", field: "Reranking", oldValue: "Disabled", newValue: "Enabled", changeType: "added" },
  { section: "Memory", field: "Episodic Memory", oldValue: "30 days", newValue: "90 days", changeType: "modified" },
  { section: "Constraints", field: "Budget Cap", oldValue: "$50/run", newValue: "$75/run", changeType: "modified" },
  { section: "Constraints", field: "Token Limit", oldValue: "100,000", newValue: "150,000", changeType: "modified" },
  { section: "Safety", field: "Toxicity Threshold", oldValue: "5%", newValue: "3%", changeType: "modified" },
  { section: "Safety", field: "PII Detection", oldValue: "Disabled", newValue: "Enabled", changeType: "added" },
];

const TYPE_STYLES = {
  added: { bg: "#E8F5E9", color: "var(--state-success)", label: "+ Added", border: "var(--state-success)" },
  removed: { bg: "#FFEBEE", color: "var(--state-error)", label: "− Removed", border: "var(--state-error)" },
  modified: { bg: "#FFF8E1", color: "var(--state-warning)", label: "~ Modified", border: "var(--state-warning)" },
};

export default function VersionDiffPage() {
  const sections = [...new Set(MOCK_DIFFS.map((d) => d.section))];
  const stats = { added: MOCK_DIFFS.filter((d) => d.changeType === "added").length, removed: MOCK_DIFFS.filter((d) => d.changeType === "removed").length, modified: MOCK_DIFFS.filter((d) => d.changeType === "modified").length };

  return (
    <AppShell
      title="Version Diff"
      breadcrumbs={[{ label: "Deployments", href: "/deployments" }, { label: "v1.2.0 ↔ v1.2.1" }]}
    >
      {/* Header */}
      <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Base Version</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)" }}>v1.2.0</div>
              <span className="chip chip-neutral" style={{ fontSize: 10 }}>Production</span>
            </div>
            <span style={{ fontSize: 28, color: "var(--text-muted)" }}>→</span>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Target Version</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--brand-primary)" }}>v1.2.1</div>
              <span className="chip chip-info" style={{ fontSize: 10 }}>Canary</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            {(["added", "removed", "modified"] as const).map((t) => (
              <div key={t} style={{ textAlign: "center", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", background: TYPE_STYLES[t].bg }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: TYPE_STYLES[t].color }}>{stats[t]}</div>
                <div style={{ fontSize: 11, color: TYPE_STYLES[t].color }}>{TYPE_STYLES[t].label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diff Sections */}
      {sections.map((section) => (
        <div key={section} className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-3)" }}>
          <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>
            {section === "Architecture" ? "🏗️" : section === "Model" ? "🤖" : section === "Tools" ? "🔧" : section === "Memory" ? "🧠" : section === "Constraints" ? "📏" : "🛡️"} {section}
          </h3>
          <table className="data-table">
            <thead>
              <tr><th>Field</th><th>v1.2.0 (Base)</th><th>v1.2.1 (Target)</th><th>Change</th></tr>
            </thead>
            <tbody>
              {MOCK_DIFFS.filter((d) => d.section === section).map((diff, i) => {
                const s = TYPE_STYLES[diff.changeType];
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{diff.field}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: diff.changeType === "removed" ? "var(--state-error)" : "var(--text-secondary)", textDecoration: diff.changeType !== "added" && diff.oldValue !== diff.newValue ? undefined : undefined }}>{diff.oldValue}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: diff.changeType === "added" ? 600 : 400, color: diff.changeType === "added" ? "var(--state-success)" : diff.newValue !== diff.oldValue ? "var(--brand-primary)" : "var(--text-secondary)" }}>{diff.newValue}</td>
                    <td><span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </AppShell>
  );
}
