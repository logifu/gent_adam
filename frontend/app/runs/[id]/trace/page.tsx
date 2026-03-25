"use client";

import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";

/**
 * RUN-003: Trace Inspector Screen
 *
 * Waterfall trace visualization for a run:
 * - OpenTelemetry span waterfall
 * - Service-level breakdown
 * - Payload inspection for each span
 * - Latency analysis per service
 */

interface TraceSpan {
  id: string;
  service: string;
  operation: string;
  startMs: number;
  durationMs: number;
  status: "ok" | "error";
  depth: number;
  tags: Record<string, string>;
}

const TOTAL_DURATION = 12000;

const MOCK_SPANS: TraceSpan[] = [
  { id: "s1", service: "supervisor", operation: "run.execute", startMs: 0, durationMs: 12000, status: "ok", depth: 0, tags: { "run_id": "run-001", "tenant_id": "t-001" } },
  { id: "s2", service: "planner", operation: "plan.compile", startMs: 200, durationMs: 2800, status: "ok", depth: 1, tags: { "plan.tasks": "4", "plan.strategy": "react" } },
  { id: "s3", service: "retrieval", operation: "knowledge.search", startMs: 500, durationMs: 1200, status: "ok", depth: 2, tags: { "query.top_k": "10", "results": "12" } },
  { id: "s4", service: "model_gateway", operation: "llm.generate", startMs: 1800, durationMs: 1100, status: "ok", depth: 2, tags: { "model": "gpt-4o", "tokens.in": "3200", "tokens.out": "850" } },
  { id: "s5", service: "swarm", operation: "task.dispatch", startMs: 3100, durationMs: 200, status: "ok", depth: 1, tags: { "worker": "worker-001" } },
  { id: "s6", service: "swarm", operation: "task.execute.subtaskA", startMs: 3300, durationMs: 4100, status: "ok", depth: 1, tags: { "task_type": "reasoning" } },
  { id: "s7", service: "model_gateway", operation: "llm.generate", startMs: 3500, durationMs: 1600, status: "ok", depth: 2, tags: { "model": "gpt-4o", "tokens.in": "5100", "tokens.out": "1200" } },
  { id: "s8", service: "tool_broker", operation: "tool.call.kb_search", startMs: 5200, durationMs: 800, status: "ok", depth: 2, tags: { "tool": "knowledge_base_search" } },
  { id: "s9", service: "policy_enforcer", operation: "policy.check", startMs: 5100, durationMs: 50, status: "ok", depth: 3, tags: { "decision": "allowed" } },
  { id: "s10", service: "model_gateway", operation: "llm.generate", startMs: 6100, durationMs: 1200, status: "ok", depth: 2, tags: { "model": "gpt-4o", "tokens.in": "6800", "tokens.out": "600" } },
  { id: "s11", service: "swarm", operation: "task.execute.subtaskB", startMs: 3500, durationMs: 3500, status: "ok", depth: 1, tags: { "task_type": "retrieval" } },
  { id: "s12", service: "retrieval", operation: "knowledge.search", startMs: 3700, durationMs: 900, status: "ok", depth: 2, tags: { "query.top_k": "15", "results": "8" } },
  { id: "s13", service: "result_aggregator", operation: "results.aggregate", startMs: 7500, durationMs: 300, status: "ok", depth: 1, tags: { "tasks_merged": "2" } },
  { id: "s14", service: "audit", operation: "audit.record", startMs: 7800, durationMs: 100, status: "ok", depth: 1, tags: { "events": "14" } },
  { id: "s15", service: "model_gateway", operation: "llm.generate", startMs: 8000, durationMs: 2500, status: "error", depth: 1, tags: { "model": "gpt-4o", "error": "rate_limit_exceeded", "retry": "1" } },
  { id: "s16", service: "model_gateway", operation: "llm.generate.retry", startMs: 10600, durationMs: 1200, status: "ok", depth: 1, tags: { "model": "gpt-4o-mini", "tokens.in": "4200", "tokens.out": "400", "fallback": "true" } },
];

const SERVICE_COLORS: Record<string, string> = {
  supervisor: "#8B5CF6", planner: "#3B82F6", retrieval: "#10B981", model_gateway: "#F59E0B",
  swarm: "#EC4899", tool_broker: "#14B8A6", policy_enforcer: "#F97316", result_aggregator: "#6366F1",
  audit: "#78716C",
};

export default function TraceInspectorPage() {
  const params = useParams();
  const runId = params?.id as string || "run-001";

  const serviceBreakdown = Object.entries(
    MOCK_SPANS.reduce((acc, s) => { acc[s.service] = (acc[s.service] || 0) + s.durationMs; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  return (
    <AppShell
      title={`Trace Inspector — ${runId}`}
      breadcrumbs={[{ label: "Runs", href: "/runs" }, { label: runId, href: `/runs/${runId}` }, { label: "Trace" }]}
    >
      {/* Summary Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        {[
          { label: "Total Duration", value: `${(TOTAL_DURATION / 1000).toFixed(1)}s` },
          { label: "Spans", value: String(MOCK_SPANS.length) },
          { label: "Services", value: String(new Set(MOCK_SPANS.map((s) => s.service)).size) },
          { label: "Errors", value: String(MOCK_SPANS.filter((s) => s.status === "error").length) },
          { label: "Max Depth", value: String(Math.max(...MOCK_SPANS.map((s) => s.depth))) },
        ].map((k) => (
          <div key={k.label} className="kpi-card"><div className="kpi-label">{k.label}</div><div className="kpi-value" style={{ fontSize: 18 }}>{k.value}</div></div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "var(--space-4)" }}>
        {/* Waterfall */}
        <div className="card" style={{ padding: "var(--space-4)", overflow: "hidden" }}>
          <h3 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>Span Waterfall</h3>
          {/* Time axis */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: "var(--space-2)", paddingLeft: 180 }}>
            {[0, 3000, 6000, 9000, 12000].map((t) => <span key={t}>{(t / 1000).toFixed(0)}s</span>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {MOCK_SPANS.map((span) => {
              const left = (span.startMs / TOTAL_DURATION) * 100;
              const width = Math.max((span.durationMs / TOTAL_DURATION) * 100, 0.5);
              const color = SERVICE_COLORS[span.service] || "#999";
              return (
                <div key={span.id} style={{ display: "flex", alignItems: "center", gap: 0, height: 26 }}>
                  <div style={{ width: 180, flexShrink: 0, display: "flex", alignItems: "center", gap: 4, paddingLeft: span.depth * 16 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: span.status === "error" ? "var(--state-error)" : "var(--text-primary)" }}>{span.operation}</span>
                  </div>
                  <div style={{ flex: 1, position: "relative", height: 18 }}>
                    <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, height: "100%", borderRadius: 3, background: span.status === "error" ? "var(--state-error)" : color, opacity: span.status === "error" ? 0.9 : 0.75, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {width > 3 && <span style={{ fontSize: 9, color: "white", fontWeight: 500 }}>{span.durationMs}ms</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Service Breakdown */}
        <div>
          <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Service Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {serviceBreakdown.map(([service, duration]) => (
                <div key={service}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: SERVICE_COLORS[service] || "#999" }} />{service}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{duration}ms</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--bg-subtle)" }}>
                    <div style={{ width: `${(duration / serviceBreakdown[0][1]) * 100}%`, height: "100%", borderRadius: 2, background: SERVICE_COLORS[service] || "#999" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "var(--space-4)" }}>
            <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Legend</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Object.entries(SERVICE_COLORS).map(([name, color]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  <span>{name.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
