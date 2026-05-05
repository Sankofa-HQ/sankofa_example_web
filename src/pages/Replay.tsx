import { useSankofa } from "../lib/SankofaProvider";
import { ActivityFeed } from "../components/ActivityFeed";

export function ReplayPage() {
  const sankofa = useSankofa();
  const replayActive = sankofa.replayEnabled && sankofa.status === "ready";

  return (
    <div className="page">
      <section className="panel hero-sub">
        <p className="eyebrow">Session Replay · rrweb DOM recording</p>
        <h2>{replayActive ? "Recording in progress." : "Replay is off."}</h2>
        <p className="lede">
          When enabled, the rrweb plugin records a compressed DOM diff
          stream and ships it to <code>/api/replay/chunks</code>. Replays
          are stitched into events in the dashboard so a click on{" "}
          <em>order_failed</em> jumps straight to the moment it broke.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Status</h3>
            <p className="muted">
              Toggle via <code>VITE_SANKOFA_ENABLE_REPLAY</code> in your env file.
            </p>
          </div>
          <span
            className="pill"
            style={{
              background: replayActive ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.15)",
              color: replayActive ? "#86efac" : "#cbd5e1",
            }}
          >
            {replayActive ? "● Recording" : "Inactive"}
          </span>
        </div>

        <div className="replay-grid">
          <ReplayStat
            label="Plugin"
            value={sankofa.replayEnabled ? "rrweb (loaded)" : "not loaded"}
            tone={sankofa.replayEnabled ? "good" : "muted"}
          />
          <ReplayStat
            label="Transport"
            value={sankofa.endpoints.replay}
            tone="default"
          />
          <ReplayStat
            label="Session id"
            value={sankofa.snapshot?.sessionId ?? "—"}
            tone="default"
          />
          <ReplayStat
            label="Distinct id"
            value={sankofa.snapshot?.distinctId ?? "—"}
            tone="default"
          />
        </div>

        {!sankofa.replayEnabled && (
          <div className="callout info">
            Set <code>VITE_SANKOFA_ENABLE_REPLAY=true</code> (or remove the
            override) and remount the SDK to start recording.
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>What gets captured</h3>
            <p className="muted">
              The rrweb plugin records a serialized DOM tree plus an
              incremental mutation stream. Sensitive fields can be masked
              with <code>data-sankofa-mask</code>.
            </p>
          </div>
        </div>
        <ul className="bullet-list">
          <li>
            <strong>DOM mutations</strong> — adds, removes, attribute changes.
          </li>
          <li>
            <strong>User input</strong> — clicks, focus, scroll, viewport.
          </li>
          <li>
            <strong>Console activity</strong> — wired into Catch breadcrumbs.
          </li>
          <li>
            <strong>Network shape</strong> — request URLs, status, durations
            (no bodies).
          </li>
        </ul>

        <div className="actions">
          <a
            className="button-link"
            href="https://docs.sankofa.dev/replay"
            target="_blank"
            rel="noreferrer"
          >
            Read the replay docs ↗
          </a>
        </div>
      </section>

      <ActivityFeed
        title="Recent activity"
        description="Each row corresponds to a moment that will appear inside the replay timeline."
        limit={12}
      />
    </div>
  );
}

function ReplayStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "good" | "muted" | "default";
}) {
  const color =
    tone === "good" ? "var(--success)" : tone === "muted" ? "var(--text-muted)" : undefined;
  return (
    <div className="endpoint">
      <span className="endpoint-label">{label}</span>
      <code className="endpoint-value" style={color ? { color } : undefined}>
        {value}
      </code>
    </div>
  );
}
