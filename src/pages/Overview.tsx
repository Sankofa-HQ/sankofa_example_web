import { Link } from "react-router-dom";
import { Sankofa } from "@sankofa/browser";
import { useSankofa } from "../lib/SankofaProvider";
import { ActivityFeed } from "../components/ActivityFeed";
import { TransportHealth } from "../components/TransportHealth";
import { NAV_ITEMS } from "../components/Layout";

const FEATURES = [
  {
    title: "Event analytics",
    body: "track() any custom event with rich properties. Pageviews + autocapture out of the box.",
    to: "/analytics",
    accent: "#a5b4fc",
  },
  {
    title: "Identity",
    body: "Stitch anonymous → known users with identify() + setPerson(). First-class people profiles.",
    to: "/identity",
    accent: "#86efac",
  },
  {
    title: "Catch (errors)",
    body: "Uncaught errors, unhandled rejections, and captureException() with breadcrumbs + flag context.",
    to: "/errors",
    accent: "#fca5a5",
  },
  {
    title: "Switch (flags)",
    body: "Server-evaluated decisions, A/B variants, kill switches, and live exposure tracking.",
    to: "/flags",
    accent: "#fda4af",
  },
  {
    title: "Config",
    body: "Typed remote values — strings, ints, floats, bools, JSON. Hot-swappable from the dashboard.",
    to: "/config",
    accent: "#67e8f9",
  },
  {
    title: "Pulse (surveys)",
    body: "In-app NPS / CSAT / branching surveys with full eligibility + lifecycle event hooks.",
    to: "/surveys",
    accent: "#fbbf24",
  },
  {
    title: "Session replay",
    body: "rrweb-powered DOM recording. Replays stitch into events for crash-cause analysis.",
    to: "/replay",
    accent: "#c084fc",
  },
];

export function OverviewPage() {
  const sankofa = useSankofa();

  const handleHello = async () => {
    await sankofa.runAction("Track hello_sankofa", async () => {
      await Sankofa.track("hello_sankofa", {
        source: "overview_page",
        cta: "primary",
      });
      sankofa.recordActivity({
        kind: "event",
        label: "hello_sankofa",
        detail: "from overview",
        payload: { source: "overview_page" },
      });
    });
  };

  return (
    <div className="page">
      <section className="panel hero">
        <p className="eyebrow">Sankofa Developer SDK · Interactive sandbox</p>
        <h1>Everything Sankofa ships, in one place.</h1>
        <p className="lede">
          A multi-page tour through the browser SDK — analytics, identity,
          error tracking, feature flags, remote config, surveys, and session
          replay. Each page is wired to a single shared client, so behavior
          you trigger anywhere flows into the live activity feed below.
        </p>

        <div className="hero-actions">
          <button onClick={handleHello} disabled={sankofa.status !== "ready"}>
            Send a test event
          </button>
          <Link to="/analytics" className="button-link">
            Open analytics →
          </Link>
        </div>

        {sankofa.status === "disabled" && (
          <div className="callout warn">
            <strong>SDK disabled.</strong> Set <code>VITE_SANKOFA_API_KEY</code>{" "}
            in <code>.env.local</code> to unlock every page.
          </div>
        )}
        {sankofa.status === "error" && (
          <div className="callout error">
            <strong>Initialization failed.</strong>{" "}
            {sankofa.errorMessage ?? "Unknown error"} — check the server is
            running, then click <em>Remount SDK</em> in the sidebar.
          </div>
        )}
        {sankofa.ingestEnvironment === "test" && sankofa.status === "ready" && (
          <div className="callout info">
            You&apos;re using a <strong>TEST</strong> key. Switch the
            dashboard to <em>Test data</em> to see these events.
          </div>
        )}
      </section>

      <TransportHealth />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Environment</h3>
            <p className="muted">Resolved transport endpoints from your init config.</p>
          </div>
        </div>
        <div className="endpoint-grid">
          <Endpoint label="Server base" value={sankofa.endpoints.base} />
          <Endpoint label="Analytics ingest" value={sankofa.endpoints.batch} />
          <Endpoint label="Replay chunks" value={sankofa.endpoints.replay} />
          <Endpoint
            label="Replay status"
            value={sankofa.replayEnabled ? "Active" : "Disabled"}
            tone={sankofa.replayEnabled ? "good" : "muted"}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Features</h3>
            <p className="muted">Click into any module to see its public surface in action.</p>
          </div>
          <span className="pill">{NAV_ITEMS.length - 1} modules</span>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <Link key={f.to} to={f.to} className="feature-card">
              <span className="feature-bar" style={{ background: f.accent }} />
              <h4>{f.title}</h4>
              <p>{f.body}</p>
              <span className="feature-cta">Open module →</span>
            </Link>
          ))}
        </div>
      </section>

      <ActivityFeed />
    </div>
  );
}

function Endpoint({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "muted";
}) {
  return (
    <div className="endpoint">
      <span className="endpoint-label">{label}</span>
      <code
        className="endpoint-value"
        style={
          tone === "good"
            ? { color: "var(--success)" }
            : tone === "muted"
              ? { color: "var(--text-muted)" }
              : undefined
        }
      >
        {value}
      </code>
    </div>
  );
}
