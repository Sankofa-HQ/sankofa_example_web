import { useState } from "react";
import { useSankofa } from "../lib/SankofaProvider";

const KIND_META: Record<string, { color: string; label: string }> = {
  event: { color: "#a5b4fc", label: "EVENT" },
  identify: { color: "#86efac", label: "IDENTIFY" },
  people: { color: "#86efac", label: "PEOPLE" },
  reset: { color: "#fbbf24", label: "RESET" },
  flush: { color: "#67e8f9", label: "FLUSH" },
  error: { color: "#fca5a5", label: "ERROR" },
  info: { color: "#cbd5e1", label: "INFO" },
};

export function ActivityFeed({
  title = "Live activity",
  description = "Every SDK call this session, newest first.",
  limit = 20,
}: {
  title?: string;
  description?: string;
  limit?: number;
}) {
  const { activity } = useSankofa();
  const [expanded, setExpanded] = useState<string | null>(null);
  const slice = activity.slice(0, limit);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <span className="pill">{activity.length} entries</span>
      </div>

      {slice.length === 0 ? (
        <p className="muted small">No activity yet — fire an event from any page.</p>
      ) : (
        <ul className="activity-list">
          {slice.map((entry) => {
            const meta = KIND_META[entry.kind] ?? KIND_META.info;
            const isOpen = expanded === entry.id;
            return (
              <li key={entry.id} className="activity-row">
                <button
                  type="button"
                  className="activity-row-btn"
                  onClick={() =>
                    setExpanded((cur) => (cur === entry.id ? null : entry.id))
                  }
                >
                  <span className="activity-kind" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="activity-label">{entry.label}</span>
                  {entry.detail && (
                    <span className="activity-detail">{entry.detail}</span>
                  )}
                  <span className="activity-time">
                    {new Date(entry.ts).toLocaleTimeString()}
                  </span>
                </button>
                {isOpen && entry.payload && (
                  <pre className="activity-payload">
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
