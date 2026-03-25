"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * CMP-001: App Shell
 *
 * Reusable shell wrapping all pages with:
 * - Left sidebar navigation (collapsible)
 * - Top bar with command palette trigger + breadcrumbs
 * - Main content area
 *
 * From UI/UX Spec: Three-panel layout available via
 * the `variant="studio"` prop for Studio screens.
 */

const NAV_SECTIONS = [
  { id: "home", label: "Home", icon: "🏠", href: "/" },
  { id: "studio", label: "Studio", icon: "🎨", href: "/studio/new" },
  { id: "runs", label: "Runs", icon: "▶️", href: "/runs" },
  { id: "eval", label: "Evaluation", icon: "🧪", href: "/eval" },
  { id: "deployments", label: "Deployments", icon: "🚀", href: "/deployments" },
  { id: "governance", label: "Governance", icon: "🛡️", href: "/governance" },
  { id: "portfolio", label: "Portfolio", icon: "📈", href: "/portfolio" },
  { id: "settings", label: "Settings", icon: "⚙️", href: "/settings" },
];

interface AppShellProps {
  children: ReactNode;
  title: string;
  /** Optional breadcrumb trail */
  breadcrumbs?: { label: string; href?: string }[];
  /** Right-side actions for the top bar */
  actions?: ReactNode;
}

export default function AppShell({
  children,
  title,
  breadcrumbs,
  actions,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`app-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        {/* Logo */}
        <div
          style={{
            padding: "var(--space-4)",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                background: "var(--brand-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              AA
            </div>
            {!sidebarCollapsed && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Agent Architect
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Pro
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "var(--space-2)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {NAV_SECTIONS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? "active" : ""}`}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            padding: "var(--space-3)",
            borderTop: "1px solid var(--border-default)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {sidebarCollapsed ? "→" : "← Collapse"}
        </button>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="app-main">
        {/* Top Bar */}
        <header className="app-topbar">
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            {breadcrumbs && breadcrumbs.length > 0 && (
              <>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        style={{
                          color: "var(--text-secondary)",
                          textDecoration: "none",
                          fontSize: 14,
                        }}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                        {crumb.label}
                      </span>
                    )}
                    {i < breadcrumbs.length - 1 && (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        /
                      </span>
                    )}
                  </span>
                ))}
                <span style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 4px" }}>
                  /
                </span>
              </>
            )}
            <h1 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h1>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            {actions}
            <button
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "6px 12px" }}
              title="Command Palette (⌘K)"
            >
              ⌘K Search...
            </button>
            <span
              style={{ fontSize: 18, cursor: "pointer" }}
              title="Notifications"
            >
              🔔
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
