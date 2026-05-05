import { Sankofa } from "@sankofa/browser";
import { useSankofa } from "../lib/SankofaProvider";

export function DiagnosticsPage() {
  const sankofa = useSankofa();
  const ready = sankofa.status === "ready";

  const handleFlush = async () => {
    await sankofa.runAction("force flush", async () => {
      await Sankofa.flush({ reason: "manual", keepalive: true });
      sankofa.recordActivity({
        kind: "flush",
        label: "Sankofa.flush()",
        detail: "from diagnostics",
      });
    });
  };

  return (
    <div className="page">
      <section className="panel hero-sub">
        <p className="eyebrow">Diagnostics · Runtime snapshot</p>
        <h2>The truth, as the SDK knows it.</h2>
        <p className="lede">
          <code>Sankofa.getSnapshot()</code> exposes the full client state —
          identity, queue depth, plugin registry, transport health.
          Refresh after any action to see the diff.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Snapshot</h3>
            <p className="muted">
              Pretty-printed. Use this when filing a bug report.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="secondary"
              disabled={!ready}
              onClick={sankofa.refresh}
            >
              Refresh
            </button>
            <button disabled={!ready} onClick={handleFlush}>
              Flush + refresh
            </button>
          </div>
        </div>
        <pre className="snapshot-block">
          {JSON.stringify(sankofa.snapshot, null, 2)}
        </pre>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Counters (this session)</h3>
            <p className="muted">
              Tallied from the in-memory activity log on this page; resets on
              reload.
            </p>
          </div>
        </div>
        <div className="kpi-row">
          <BigKpi label="Events" value={sankofa.counters.events} />
          <BigKpi label="Errors" value={sankofa.counters.errors} accent="#fda4af" />
          <BigKpi
            label="Identifies"
            value={sankofa.counters.identifies}
            accent="#a5b4fc"
          />
          <BigKpi
            label="Manual flushes"
            value={sankofa.counters.flushes}
            accent="#86efac"
          />
        </div>
      </section>
    </div>
  );
}

function BigKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="big-kpi">
      <strong style={accent ? { color: accent } : undefined}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
