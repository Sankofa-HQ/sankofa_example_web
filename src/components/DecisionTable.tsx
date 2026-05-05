import type { FlagDecision } from "@sankofa/switch";
import type { ItemDecision } from "@sankofa/config";

export interface DecisionRow {
  key: string;
  description: string;
  decision: FlagDecision | ItemDecision;
  kind: "flag" | "config";
}

export function DecisionTable({ rows }: { rows: DecisionRow[] }) {
  return (
    <div className="decision-table">
      {rows.map((row) => (
        <div key={row.key} className="decision-row">
          <div className="decision-key">
            <code>{row.key}</code>
            <span className="muted small">{row.description}</span>
          </div>
          <div className="decision-value">
            <ValueRender decision={row.decision} kind={row.kind} />
          </div>
          <div>
            <span
              className="reason-pill"
              style={{
                background: reasonBg(row.decision.reason),
                color: reasonFg(row.decision.reason),
              }}
            >
              {row.decision.reason}
            </span>
          </div>
          <div className="decision-version">v{row.decision.version}</div>
        </div>
      ))}
    </div>
  );
}

function ValueRender({
  decision,
  kind,
}: {
  decision: FlagDecision | ItemDecision;
  kind: "flag" | "config";
}) {
  if (kind === "flag") {
    const d = decision as FlagDecision;
    if (d.variant) {
      return (
        <span className="mono">
          <strong style={{ color: "#fda4af" }}>{d.variant}</strong>{" "}
          <span className="muted">
            (value: {String(d.value)})
          </span>
        </span>
      );
    }
    return (
      <span
        className="mono"
        style={{ color: d.value ? "#86efac" : "#fda4af" }}
      >
        {String(d.value)}
      </span>
    );
  }
  const d = decision as ItemDecision;
  if (d.type === "json") {
    return (
      <code className="json-snippet">
        {JSON.stringify(d.value)}
      </code>
    );
  }
  return (
    <span className="mono">
      {typeof d.value === "string" ? `"${d.value}"` : String(d.value)}
      <span className="muted small" style={{ marginLeft: 8 }}>
        ({d.type})
      </span>
    </span>
  );
}

function reasonBg(reason: string): string {
  if (reason === "halted") return "#dc262622";
  if (reason === "rollout" || reason === "rule_matched") return "#10b98122";
  if (reason === "local_default") return "#ffffff0c";
  if (reason.startsWith("not_in") || reason.startsWith("in_excluded"))
    return "#f59e0b22";
  return "#6366f122";
}

function reasonFg(reason: string): string {
  if (reason === "halted") return "#fca5a5";
  if (reason === "rollout" || reason === "rule_matched") return "#86efac";
  if (reason === "local_default") return "var(--text-muted)";
  if (reason.startsWith("not_in") || reason.startsWith("in_excluded"))
    return "#fcd34d";
  return "#a5b4fc";
}
