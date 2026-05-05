import { useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Sankofa } from "@sankofa/browser";
import { useSankofa } from "../lib/SankofaProvider";

export type NavItem = {
  to: string;
  label: string;
  icon: string;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", icon: "◈", description: "Status & at-a-glance" },
  { to: "/analytics", label: "Analytics", icon: "◷", description: "Track events & flows" },
  { to: "/identity", label: "Identity", icon: "◉", description: "Identify users & traits" },
  { to: "/errors", label: "Errors", icon: "✕", description: "Catch crashes & breadcrumbs" },
  { to: "/flags", label: "Feature Flags", icon: "⚑", description: "Switch decisions" },
  { to: "/config", label: "Remote Config", icon: "⚙", description: "Typed remote values" },
  { to: "/surveys", label: "Surveys", icon: "✦", description: "Pulse + targeting" },
  { to: "/replay", label: "Session Replay", icon: "▶", description: "rrweb recording" },
  { to: "/diagnostics", label: "Diagnostics", icon: "◰", description: "Runtime snapshot" },
];

const STATUS_DOT: Record<string, string> = {
  ready: "var(--success)",
  booting: "#facc15",
  error: "var(--error)",
  disabled: "#94a3b8",
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Live",
  booting: "Booting",
  error: "Error",
  disabled: "Disabled",
};

export function Layout() {
  const sankofa = useSankofa();
  const location = useLocation();

  // Auto-track every route change as a pageview. Mirrors what production
  // SPAs do — Sankofa SDK history-aware autocapture handles this in
  // real apps; here we make it explicit so it's visible in the activity
  // log on every navigation.
  useEffect(() => {
    if (sankofa.status !== "ready") return;
    const path = location.pathname;
    const item = NAV_ITEMS.find((n) => n.to === path);
    void Sankofa.track("$pageview", {
      $current_url: window.location.href,
      $pathname: path,
      $title: item?.label ?? document.title,
    });
    sankofa.recordActivity({
      kind: "event",
      label: "$pageview",
      detail: path,
      payload: { path, title: item?.label ?? document.title },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, sankofa.status]);

  const dot = STATUS_DOT[sankofa.status] ?? "#94a3b8";
  const dotLabel = STATUS_LABEL[sankofa.status] ?? "Unknown";

  const active = useMemo(
    () => NAV_ITEMS.find((n) => n.to === location.pathname),
    [location.pathname],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brand-mark"
            src="/sankofa-icon.webp"
            alt="Sankofa"
            width={36}
            height={36}
          />
          <div className="brand-meta">
            <strong>Sankofa</strong>
            <span>Developer Sandbox</span>
          </div>
        </div>

        <div className="status-card">
          <span className="status-dot" style={{ background: dot }} />
          <div>
            <div className="status-label">{dotLabel}</div>
            <div className="status-sub">{sankofa.ingestEnvironment.toUpperCase()} environment</div>
          </div>
        </div>

        <div className="api-key-card">
          <div className="api-key-card-row">
            <span className="api-key-label">API key</span>
            <span className={`env-tag env-${sankofa.ingestEnvironment}`}>
              {sankofa.ingestEnvironment.toUpperCase()}
            </span>
          </div>
          <code className="api-key-mask">{maskKey(sankofa.apiKey)}</code>
          <div className="api-key-actions">
            <button
              type="button"
              className="ghost"
              onClick={sankofa.clearApiKey}
              title="Forget this key and return to the connect screen"
            >
              Disconnect
            </button>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.description}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="ghost"
            disabled={sankofa.initializing || sankofa.status === "disabled"}
            onClick={sankofa.remount}
          >
            {sankofa.initializing ? "Mounting…" : "Remount SDK"}
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              <span>Sankofa</span>
              <span className="breadcrumb-sep">/</span>
              <strong>{active?.label ?? "Page"}</strong>
            </div>
            <p className="topbar-status">{sankofa.statusText}</p>
          </div>
          <div className="topbar-right">
            <KPI label="Events" value={sankofa.counters.events} />
            <KPI label="Errors" value={sankofa.counters.errors} accent="#fda4af" />
            <KPI label="Identifies" value={sankofa.counters.identifies} accent="#a5b4fc" />
            <KPI label="Flushes" value={sankofa.counters.flushes} accent="#86efac" />
          </div>
        </header>

        <div className="page-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

function maskKey(key: string): string {
  if (!key) return "—";
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}
