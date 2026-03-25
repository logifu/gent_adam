"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Stepper from "@/components/Stepper";

/**
 * STU-008: Memory Config Screen
 * 
 * Configure agent's knowledge retrieval and memory systems:
 * - Knowledge base sources (documents, embeddings)
 * - Episodic memory (run history, learned patterns)
 * - Retrieval settings (top-k, similarity threshold, reranking)
 * - Memory persistence and cleanup policies
 */

const LIFECYCLE_STEPS = [
  { id: "brief", label: "Brief", description: "Goal & requirements", status: "completed" as const },
  { id: "design", label: "Design", description: "Architecture candidates", status: "completed" as const },
  { id: "compare", label: "Compare", description: "Side-by-side tradeoffs", status: "completed" as const },
  { id: "tools", label: "Tools", description: "Tool access config", status: "completed" as const },
  { id: "memory", label: "Memory", description: "Knowledge & memory", status: "active" as const },
  { id: "evaluate", label: "Evaluate", description: "Benchmarks & safety", status: "upcoming" as const },
];

interface KnowledgeSource {
  id: string;
  name: string;
  type: "document_set" | "database" | "api_feed" | "web_crawl";
  documentCount: number;
  embeddingModel: string;
  lastSynced: string;
  enabled: boolean;
  sizeBytes: number;
}

const MOCK_SOURCES: KnowledgeSource[] = [
  { id: "ks1", name: "Product Documentation", type: "document_set", documentCount: 234, embeddingModel: "text-embedding-3-large", lastSynced: "2 hours ago", enabled: true, sizeBytes: 45000000 },
  { id: "ks2", name: "Support Ticket Archive", type: "database", documentCount: 12400, embeddingModel: "text-embedding-3-large", lastSynced: "1 hour ago", enabled: true, sizeBytes: 380000000 },
  { id: "ks3", name: "Company Wiki", type: "web_crawl", documentCount: 890, embeddingModel: "text-embedding-3-small", lastSynced: "6 hours ago", enabled: true, sizeBytes: 120000000 },
  { id: "ks4", name: "API Changelog Feed", type: "api_feed", documentCount: 56, embeddingModel: "text-embedding-3-small", lastSynced: "30 min ago", enabled: false, sizeBytes: 2500000 },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

const TYPE_ICONS = { document_set: "📄", database: "🗄️", api_feed: "🔌", web_crawl: "🌐" };

export default function MemoryConfigPage() {
  const [sources, setSources] = useState(MOCK_SOURCES);
  const [topK, setTopK] = useState(10);
  const [threshold, setThreshold] = useState(0.75);
  const [reranking, setReranking] = useState(true);
  const [episodicMemory, setEpisodicMemory] = useState(true);
  const [retentionDays, setRetentionDays] = useState(90);

  const totalDocs = sources.filter((s) => s.enabled).reduce((a, s) => a + s.documentCount, 0);
  const totalSize = sources.filter((s) => s.enabled).reduce((a, s) => a + s.sizeBytes, 0);

  return (
    <AppShell
      title="Memory Configuration"
      breadcrumbs={[{ label: "Studio", href: "/studio/new" }, { label: "Memory" }]}
      actions={<button className="btn btn-primary">Save Configuration →</button>}
    >
      <div className="studio-layout">
        {/* Left: Lifecycle + Summary */}
        <div className="studio-left">
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Lifecycle</h3>
          <Stepper steps={LIFECYCLE_STEPS} />
          <div style={{ margin: "var(--space-4) 0", borderTop: "1px solid var(--border-default)" }} />
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>Memory Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {[
              { label: "Knowledge Sources", value: `${sources.filter((s) => s.enabled).length}/${sources.length}`, icon: "📚" },
              { label: "Total Documents", value: totalDocs.toLocaleString(), icon: "📄" },
              { label: "Index Size", value: formatBytes(totalSize), icon: "💾" },
              { label: "Embedding Model", value: "ada-3-large", icon: "🧠" },
              { label: "Episodic Memory", value: episodicMemory ? "On" : "Off", icon: "🔄" },
              { label: "Retention", value: `${retentionDays} days`, icon: "📅" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2)", fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}><span>{item.icon}</span><span style={{ color: "var(--text-secondary)" }}>{item.label}</span></span>
                <span style={{ fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Knowledge Sources + Settings */}
        <div className="studio-center">
          {/* Knowledge Sources */}
          <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h2 className="type-heading-2">📚 Knowledge Sources</h2>
              <button className="btn btn-secondary" style={{ fontSize: 12 }}>+ Add Source</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {sources.map((src) => (
                <div key={src.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3)", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", opacity: src.enabled ? 1 : 0.6 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[src.type]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{src.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: "var(--space-3)", marginTop: 2 }}>
                      <span>{src.documentCount.toLocaleString()} docs</span>
                      <span>{formatBytes(src.sizeBytes)}</span>
                      <span>Synced {src.lastSynced}</span>
                    </div>
                  </div>
                  <span className="chip chip-neutral" style={{ fontSize: 10 }}>{src.embeddingModel.replace("text-embedding-", "")}</span>
                  <button onClick={() => setSources((p) => p.map((s) => s.id === src.id ? { ...s, enabled: !s.enabled } : s))} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: src.enabled ? "var(--state-success)" : "var(--border-default)", position: "relative", transition: "background var(--motion-fast)" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: src.enabled ? 21 : 3, transition: "left var(--motion-fast)", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Retrieval Settings */}
          <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <h2 className="type-heading-2" style={{ marginBottom: "var(--space-3)" }}>⚙️ Retrieval Settings</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div>
                <label className="type-label" style={{ display: "block", marginBottom: "var(--space-1)", color: "var(--text-muted)" }}>Top-K Results</label>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <input type="range" min={1} max={50} value={topK} onChange={(e) => setTopK(Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, minWidth: 30 }}>{topK}</span>
                </div>
              </div>
              <div>
                <label className="type-label" style={{ display: "block", marginBottom: "var(--space-1)", color: "var(--text-muted)" }}>Similarity Threshold</label>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <input type="range" min={50} max={99} value={threshold * 100} onChange={(e) => setThreshold(Number(e.target.value) / 100)} style={{ flex: 1 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, minWidth: 40 }}>{(threshold * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: "var(--space-3)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2)", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: 13 }}>Enable Reranking (cross-encoder)</span>
              <button onClick={() => setReranking(!reranking)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: reranking ? "var(--state-success)" : "var(--border-default)", position: "relative", transition: "background var(--motion-fast)" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: reranking ? 21 : 3, transition: "left var(--motion-fast)", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          </div>

          {/* Episodic Memory */}
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h2 className="type-heading-2">🔄 Episodic Memory</h2>
              <button onClick={() => setEpisodicMemory(!episodicMemory)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: episodicMemory ? "var(--state-success)" : "var(--border-default)", position: "relative", transition: "background var(--motion-fast)" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: episodicMemory ? 23 : 3, transition: "left var(--motion-fast)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "var(--space-3)" }}>When enabled, the agent remembers patterns from past runs — successful strategies, common errors, and user preferences — to improve performance over time.</p>
            {episodicMemory && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                <div className="kpi-card"><div className="kpi-label">Stored Patterns</div><div className="kpi-value" style={{ fontSize: 18 }}>47</div></div>
                <div className="kpi-card"><div className="kpi-label">Success Rate Impact</div><div className="kpi-value" style={{ fontSize: 18, color: "var(--state-success)" }}>+12%</div></div>
                <div className="kpi-card">
                  <div className="kpi-label">Retention</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", marginTop: 4 }}>
                    <input type="number" value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))} style={{ width: 50, padding: 4, borderRadius: 4, border: "1px solid var(--border-default)", fontSize: 14, fontWeight: 600, textAlign: "center" }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>days</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Recommendations */}
        <div className="studio-right">
          <h3 className="type-label" style={{ marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>AI Recommendations</h3>
          {[
            { type: "suggestion" as const, title: "Increase Top-K for This Domain", msg: "Your knowledge base has highly similar documents. Increasing top-k to 15 and using reranking will improve answer quality.", confidence: 0.89 },
            { type: "info" as const, title: "Embedding Model Assessment", msg: "text-embedding-3-large provides 94% recall for your document types. No model change needed.", confidence: 0.92 },
            { type: "warning" as const, title: "Stale Knowledge Source", msg: "API Changelog Feed hasn't been synced in 6 hours. Consider enabling auto-sync or increasing frequency.", confidence: 0.78 },
          ].map((insight, i) => {
            const colors = { suggestion: { bg: "#E8EEFB", border: "var(--brand-primary)", icon: "💡" }, warning: { bg: "#FFF8E1", border: "var(--state-warning)", icon: "⚠️" }, info: { bg: "#E3F2FD", border: "var(--state-info)", icon: "ℹ️" } };
            const s = colors[insight.type];
            return (
              <div key={i} style={{ padding: "var(--space-3)", background: s.bg, borderRadius: "var(--radius-sm)", borderLeft: `3px solid ${s.border}`, marginBottom: "var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}><span>{s.icon}</span><span style={{ fontWeight: 500, fontSize: 13 }}>{insight.title}</span></div>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-secondary)", marginBottom: 6 }}>{insight.msg}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.08)" }}><div style={{ width: `${insight.confidence * 100}%`, height: "100%", borderRadius: 2, background: s.border }} /></div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(insight.confidence * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
