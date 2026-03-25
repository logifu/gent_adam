"use client";

import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Stepper from "@/components/Stepper";

/**
 * Run Detail Screen (APP-004)
 *
 * Detailed view of a single run:
 * - Three-panel layout with task DAG, main content, and metrics
 * - Live-streaming task execution log
 * - Cost and token consumption tracking
 * - Audit trail connection
 */

const MOCK_TASKS = [
  { id: "task-1", name: "Parse Goal", status: "completed", duration: "1.2s", tokens: 800, cost: "$0.02" },
  { id: "task-2", name: "Retrieve Context", status: "completed", duration: "2.8s", tokens: 4200, cost: "$0.15" },
  { id: "task-3", name: "Generate Plan", status: "completed", duration: "3.5s", tokens: 8500, cost: "$0.30" },
  { id: "task-4", name: "Execute Subtask A", status: "completed", duration: "4.1s", tokens: 12000, cost: "$0.45" },
  { id: "task-5", name: "Execute Subtask B", status: "running", duration: "2.0s", tokens: 6500, cost: "$0.22" },
  { id: "task-6", name: "Aggregate Results", status: "upcoming", duration: "—", tokens: 0, cost: "—" },
  { id: "task-7", name: "Validate Output", status: "upcoming", duration: "—", tokens: 0, cost: "—" },
];

const EXECUTION_LOG = [
  { time: "14:32:01", level: "info", message: "Run started — parsing goal objective" },
  { time: "14:32:02", level: "info", message: "Goal parsed successfully. Identified 3 sub-objectives." },
  { time: "14:32:03", level: "info", message: "Retrieving context from knowledge base (47 documents)..." },
  { time: "14:32:05", level: "info", message: "Retrieved 12 relevant documents (relevance > 0.85)" },
  { time: "14:32:06", level: "info", message: "Generating execution plan with ReAct architecture..." },
  { time: "14:32:09", level: "info", message: "Plan generated: 4 tasks with 2 parallel branches" },
  { time: "14:32:10", level: "info", message: "Dispatching task 'Execute Subtask A' to worker-001" },
  { time: "14:32:10", level: "info", message: "Dispatching task 'Execute Subtask B' to worker-002" },
  { time: "14:32:14", level: "info", message: "Subtask A completed — 12,000 tokens, $0.45 cost" },
  { time: "14:32:16", level: "warn", message: "Subtask B approaching token budget threshold (65%)" },
  { time: "14:32:17", level: "info", message: "Subtask B in progress — reasoning step 3/5..." },
];

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params?.id as string || "run-001";

  const totalTokens = 32000;
  const totalCost = 1.14;
  const budgetMax = 10.0;

  return (
    <AppShell
      title={`Run ${runId}`}
      breadcrumbs={[
        { label: "Runs", href: "/runs" },
        { label: runId },
      ]}
      actions={
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="btn btn-secondary">View Audit Trail</button>
          <button className="btn btn-secondary" style={{ color: "var(--state-error)" }}>Cancel Run</button>
        </div>
      }
    >
      <div className="studio-layout">
        {/* Left Panel: Task DAG */}
        <div className="studio-left">
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
            Task Pipeline
          </h3>
          <Stepper
            steps={MOCK_TASKS.map((t) => ({
              id: t.id,
              label: t.name,
              description: t.status === "completed" ? t.duration : t.status === "running" ? "In progress..." : "Pending",
              status: t.status === "completed" ? "completed" as const : t.status === "running" ? "active" as const : "upcoming" as const,
            }))}
          />

          <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-default)" }}>
            <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
              Run Metadata
            </h3>
            {[
              { label: "Agent", value: "Customer Support Agent v1.2" },
              { label: "Architecture", value: "ReAct + RAG" },
              { label: "Initiator", value: "auto-trigger" },
              { label: "Started", value: "2 min ago" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-1) 0", fontSize: 12 }}>
                <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                <span style={{ fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Execution Log + Task Details */}
        <div className="studio-center">
          {/* Task Table */}
          <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>Task Breakdown</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Tokens</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TASKS.map((task) => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 500 }}>{task.name}</td>
                    <td>
                      <span
                        className={`chip ${
                          task.status === "completed" ? "chip-success" :
                          task.status === "running" ? "chip-info" : "chip-neutral"
                        }`}
                      >
                        {task.status === "running" && "⏳ "}
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{task.duration}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{task.tokens.toLocaleString()}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{task.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live Execution Log */}
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h3 className="type-heading-2">Execution Log</h3>
              <span style={{ fontSize: 11, color: "var(--state-info)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--state-info)", animation: "pulse 1.5s infinite" }} />
                Live
              </span>
            </div>
            <div
              style={{
                background: "#1A1A2E",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-3)",
                maxHeight: 320,
                overflowY: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.8,
              }}
            >
              {EXECUTION_LOG.map((entry, i) => (
                <div key={i} style={{ display: "flex", gap: "var(--space-2)" }}>
                  <span style={{ color: "#666", minWidth: 65 }}>{entry.time}</span>
                  <span
                    style={{
                      color: entry.level === "warn" ? "#FFB74D" : entry.level === "error" ? "#EF5350" : "#81C784",
                      minWidth: 40,
                    }}
                  >
                    [{entry.level.toUpperCase()}]
                  </span>
                  <span style={{ color: "#E0E0E0" }}>{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Metrics + Cost */}
        <div className="studio-right">
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
            Run Metrics
          </h3>

          {/* Budget Gauge */}
          <div style={{ padding: "var(--space-3)", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", textAlign: "center" }}>
            <div className="type-label" style={{ color: "var(--text-muted)", marginBottom: 4 }}>Budget Used</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: totalCost / budgetMax > 0.8 ? "var(--state-warning)" : "var(--state-success)" }}>
              {Math.round((totalCost / budgetMax) * 100)}%
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              ${totalCost.toFixed(2)} / ${budgetMax.toFixed(2)}
            </div>
            {/* Budget bar */}
            <div style={{ height: 4, borderRadius: 2, background: "var(--border-default)", marginTop: 8 }}>
              <div style={{ width: `${(totalCost / budgetMax) * 100}%`, height: "100%", borderRadius: 2, background: "var(--state-success)", transition: "width var(--motion-standard)" }} />
            </div>
          </div>

          {/* Metric Cards */}
          {[
            { label: "Total Tokens", value: totalTokens.toLocaleString(), icon: "🔤" },
            { label: "Total Cost", value: `$${totalCost.toFixed(2)}`, icon: "💰" },
            { label: "Duration", value: "16.6s", icon: "⏱️" },
            { label: "Tasks", value: "5/7 complete", icon: "📋" },
            { label: "Model Calls", value: "12", icon: "🤖" },
            { label: "Tool Calls", value: "5", icon: "🔧" },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-2)",
                fontSize: 13,
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span>{m.icon}</span>
                <span style={{ color: "var(--text-secondary)" }}>{m.label}</span>
              </span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{m.value}</span>
            </div>
          ))}

          {/* Audit Trail Link */}
          <div
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-3)",
              background: "#E8EEFB",
              borderRadius: "var(--radius-sm)",
              borderLeft: "3px solid var(--brand-primary)",
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 12, color: "var(--brand-primary)", marginBottom: 4 }}>
              🔗 Audit Trail
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              11 events recorded. Hash chain verified ✓
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
