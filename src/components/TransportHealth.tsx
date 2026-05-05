import { useSankofa } from "../lib/SankofaProvider";
import type { TransportFailureKind } from "@sankofa/browser";

const FAILURE_HINTS: Record<TransportFailureKind, string> = {
  cors: "Server is reachable but did not return CORS headers for this origin. Add this origin to the project's allowed origins, or run the example on the same host as the server.",
  network:
    "Browser couldn't reach the server at all. Check that the endpoint URL is correct, the server is running, and you don't have an ad-blocker / VPN / certificate error in the way.",
  http_error:
    "Server responded with an error status. Check the API key matches the project, and that the request route is enabled on this deployment.",
  timeout: "Request timed out before the server replied. The server may be overloaded.",
  unknown: "Unrecognised transport failure — open the browser console for the raw error.",
};

export function TransportHealth() {
  const { transport, endpoints, status } = useSankofa();

  if (status !== "ready") return null;

  const tone = transport?.lastResult === "error" ? "error" : transport?.lastResult === "ok" ? "ok" : "pending";
  const dotColor =
    tone === "error" ? "var(--error)" : tone === "ok" ? "var(--success)" : "#facc15";
  const headline =
    tone === "error"
      ? "Events are NOT reaching the dashboard"
      : tone === "ok"
        ? "Events are landing in the dashboard"
        : "Waiting for the first flush…";

  return (
    <section className="panel transport-panel">
      <div className="transport-head">
        <div className="transport-headline">
          <span className="transport-dot" style={{ background: dotColor }} />
          <div>
            <strong>{headline}</strong>
            <span className="muted small">
              POST {endpoints.batch}
            </span>
          </div>
        </div>
        <div className="transport-stats">
          <Stat label="Sent" value={transport?.successfulOperations ?? 0} tone="good" />
          <Stat
            label="OK"
            value={transport?.successfulAttempts ?? 0}
            tone="good"
          />
          <Stat
            label="Failed"
            value={transport?.failedAttempts ?? 0}
            tone={transport?.failedAttempts ? "bad" : "muted"}
          />
        </div>
      </div>

      {tone === "error" && transport && (
        <div className="callout error" style={{ marginTop: 16 }}>
          <div>
            <strong>
              {transport.lastFailureKind === "http_error"
                ? `HTTP ${transport.lastStatus} from server`
                : `${transport.lastFailureKind ?? "error"}: ${transport.lastError}`}
            </strong>
            <p className="muted small" style={{ margin: "4px 0 0" }}>
              {FAILURE_HINTS[transport.lastFailureKind ?? "unknown"]}
            </p>
          </div>
        </div>
      )}

      {tone === "ok" && transport && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Last successful flush at{" "}
          {new Date(transport.lastAttemptAt!).toLocaleTimeString()} —{" "}
          {transport.successfulOperations} operations delivered this session.
        </p>
      )}

      {tone === "pending" && (
        <p className="muted small" style={{ marginTop: 12 }}>
          The SDK auto-flushes every 2 seconds. Fire any event to trigger the
          first attempt.
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "bad" | "muted";
}) {
  const color =
    tone === "good" ? "#86efac" : tone === "bad" ? "#fca5a5" : "var(--text-muted)";
  return (
    <div className="transport-stat">
      <strong style={{ color }}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
