"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";

/**
 * Settings & Policy Profiles Screen
 *
 * System-wide configuration:
 * - Tenant settings
 * - Default policy profiles
 * - Model preferences
 * - Notification preferences
 * - Feature flags
 */

interface PolicyProfile {
  id: string;
  name: string;
  description: string;
  rules: number;
  active: boolean;
}

const PROFILES: PolicyProfile[] = [
  { id: "pp-1", name: "Default Security", description: "Base security policy — fail-closed, rate limits, PII detection enabled", rules: 12, active: true },
  { id: "pp-2", name: "High Trust Internal", description: "Relaxed limits for internal-only agents — higher rate limits and budget caps", rules: 8, active: false },
  { id: "pp-3", name: "Compliance Strict", description: "Maximum enforcement — audit logging, dual approval, no external tools", rules: 18, active: false },
  { id: "pp-4", name: "Development Mode", description: "Minimal restrictions for local development — all tools granted, no budget limits", rules: 4, active: false },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [profiles, setProfiles] = useState(PROFILES);

  const tabs = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "policies", label: "Policy Profiles", icon: "🛡️" },
    { id: "models", label: "Model Preferences", icon: "🤖" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "features", label: "Feature Flags", icon: "🚩" },
  ];

  return (
    <AppShell
      title="Settings"
      breadcrumbs={[{ label: "Settings" }]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "var(--space-4)" }}>
        {/* Tab Nav */}
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`nav-item ${activeTab === tab.id ? "active" : ""}`} style={{ border: "none", background: activeTab === tab.id ? "var(--brand-light)" : "none" }}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === "general" && (
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <h2 className="type-heading-1" style={{ marginBottom: "var(--space-4)" }}>General Settings</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {[
                  { label: "Organization Name", value: "Acme Corp", type: "text" },
                  { label: "Tenant ID", value: "tenant_acme_prod", type: "readonly" },
                  { label: "Default Environment", value: "staging", type: "select", options: ["development", "staging", "production"] },
                  { label: "Max Concurrent Runs", value: "25", type: "number" },
                  { label: "Default Budget Cap (USD/run)", value: "50", type: "number" },
                  { label: "Session Timeout (minutes)", value: "120", type: "number" },
                ].map((field) => (
                  <div key={field.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: 14, fontWeight: 500 }}>{field.label}</label>
                    {field.type === "readonly" ? (
                      <code style={{ padding: "var(--space-2) var(--space-3)", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>{field.value}</code>
                    ) : field.type === "select" ? (
                      <select defaultValue={field.value} style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: 13 }}>
                        {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} defaultValue={field.value} style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: 13, width: 250, textAlign: "right" }} />
                    )}
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)" }}>
                  <button className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "policies" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                <h2 className="type-heading-1">Policy Profiles</h2>
                <button className="btn btn-primary">+ Create Profile</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {profiles.map((profile) => (
                  <div key={profile.id} className="card" style={{ padding: "var(--space-4)", borderLeft: profile.active ? "4px solid var(--state-success)" : "4px solid transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{profile.name}</h3>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{profile.description}</p>
                        <span className="chip chip-neutral" style={{ fontSize: 10 }}>{profile.rules} rules</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        {profile.active && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--state-success)" }}>✓ Active</span>}
                        <button onClick={() => setProfiles((p) => p.map((pp) => ({ ...pp, active: pp.id === profile.id })))} className={`btn ${profile.active ? "btn-secondary" : "btn-primary"}`} style={{ fontSize: 12 }}>
                          {profile.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "models" && (
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <h2 className="type-heading-1" style={{ marginBottom: "var(--space-4)" }}>Model Preferences</h2>
              {[
                { label: "Primary Model", value: "gpt-4o-2024-03", options: ["gpt-4o-2024-03", "gpt-4o-2024-01", "claude-3.5-sonnet", "gemini-2.0-flash"] },
                { label: "Fallback Model", value: "gpt-4o-mini", options: ["gpt-4o-mini", "claude-3-haiku", "gemini-1.5-flash", "none"] },
                { label: "Embedding Model", value: "text-embedding-3-large", options: ["text-embedding-3-large", "text-embedding-3-small", "voyage-3"] },
                { label: "Default Temperature", value: "0.5", type: "range" },
                { label: "Max Tokens per Request", value: "4096", type: "number" },
                { label: "Request Timeout (s)", value: "30", type: "number" },
              ].map((pref) => (
                <div key={pref.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <label style={{ fontSize: 14, fontWeight: 500 }}>{pref.label}</label>
                  {pref.options ? (
                    <select defaultValue={pref.value} style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: 13 }}>
                      {pref.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={pref.type || "text"} defaultValue={pref.value} style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: 13, width: 120, textAlign: "right" }} />
                  )}
                </div>
              ))}
              <div style={{ paddingTop: "var(--space-4)" }}><button className="btn btn-primary">Save Model Preferences</button></div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <h2 className="type-heading-1" style={{ marginBottom: "var(--space-4)" }}>Notification Preferences</h2>
              {[
                { label: "Run Failures", description: "Get notified when a run fails", enabled: true },
                { label: "Budget Threshold Alerts", description: "Alert at 80% of budget cap", enabled: true },
                { label: "Safety Violations", description: "Immediate notification on safety check failures", enabled: true },
                { label: "Deployment Events", description: "Notifications for promotions and rollbacks", enabled: true },
                { label: "Governance Queue Updates", description: "New items pending your approval", enabled: false },
                { label: "Weekly Performance Digest", description: "Automated summary of agent fleet performance", enabled: false },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div><div style={{ fontWeight: 500, fontSize: 14 }}>{item.label}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.description}</div></div>
                  <div style={{ width: 44, height: 24, borderRadius: 12, background: item.enabled ? "var(--state-success)" : "var(--border-default)", position: "relative", cursor: "pointer" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: item.enabled ? 23 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "features" && (
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <h2 className="type-heading-1" style={{ marginBottom: "var(--space-4)" }}>Feature Flags</h2>
              {[
                { name: "episodic_memory_v2", description: "Enhanced episodic memory with pattern clustering", enabled: true, stage: "GA" },
                { name: "canary_auto_promote", description: "Auto-promote canary after 4h healthy observation", enabled: false, stage: "Beta" },
                { name: "multi_agent_swarm", description: "Enable multi-agent swarm coordination", enabled: true, stage: "GA" },
                { name: "streaming_responses", description: "Stream LLM responses to client in real-time", enabled: true, stage: "GA" },
                { name: "cost_prediction", description: "Predict run costs before execution", enabled: false, stage: "Alpha" },
                { name: "auto_remediation", description: "Automatically retry failed tasks with adjusted params", enabled: false, stage: "Beta" },
              ].map((flag) => (
                <div key={flag.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <code style={{ fontWeight: 500, fontSize: 13 }}>{flag.name}</code>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: flag.stage === "GA" ? "#E8F5E9" : flag.stage === "Beta" ? "#FFF8E1" : "#FFEBEE", color: flag.stage === "GA" ? "var(--state-success)" : flag.stage === "Beta" ? "var(--state-warning)" : "var(--state-error)" }}>{flag.stage}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{flag.description}</div>
                  </div>
                  <div style={{ width: 44, height: 24, borderRadius: 12, background: flag.enabled ? "var(--state-success)" : "var(--border-default)", position: "relative", cursor: "pointer" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: flag.enabled ? 23 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
