import { useEffect, useMemo, useState } from "react";
import { getConfig, type ItemDecision } from "@sankofa/config";
import {
  DEMO_CONFIG,
  DEMO_CONFIG_DEFAULTS,
  DEMO_CONFIG_DESCRIPTIONS,
} from "../sankofaDemo";
import { useSankofa } from "../lib/SankofaProvider";
import { DecisionTable } from "../components/DecisionTable";

export function ConfigPage() {
  const sankofa = useSankofa();
  const ready = sankofa.status === "ready";
  const configApi = ready ? getConfig() : null;

  const [rev, setRev] = useState(0);
  useEffect(() => {
    if (!configApi) return;
    const unsub: Array<() => void> = [];
    for (const key of Object.values(DEMO_CONFIG)) {
      unsub.push(configApi.onChange(key, () => setRev((n) => n + 1)));
    }
    return () => {
      for (const u of unsub) u();
    };
  }, [configApi]);

  const decisions = useMemo(() => {
    return Object.values(DEMO_CONFIG).reduce<Record<string, ItemDecision>>((acc, key) => {
      acc[key] = configApi?.getDecision(key) ?? DEMO_CONFIG_DEFAULTS[key];
      return acc;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configApi, rev]);

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of Object.values(decisions)) {
      map[d.type] = (map[d.type] ?? 0) + 1;
    }
    return map;
  }, [decisions]);

  return (
    <div className="page">
      <section className="panel hero-sub">
        <p className="eyebrow">Config · Typed remote values</p>
        <h2>Strings, numbers, booleans, JSON — hot-swappable.</h2>
        <p className="lede">
          Remote config powers values that aren&apos;t flags but still need
          dashboard control: support URLs, quotas, banner copy, theme
          tokens, and arbitrary JSON. Each value is typed and versioned.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Type breakdown</h3>
            <p className="muted">
              Counts by declared type, computed from the live decisions.
            </p>
          </div>
        </div>
        <div className="type-grid">
          {Object.entries(typeCounts).map(([t, n]) => (
            <div key={t} className="type-card">
              <span className="type-count">{n}</span>
              <span className="type-name">{t}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Live config decisions</h3>
            <p className="muted">
              Subscribed via <code>configApi.onChange()</code>. Dashboard
              edits propagate without a reload.
            </p>
          </div>
        </div>
        <DecisionTable
          rows={Object.values(DEMO_CONFIG).map((key) => ({
            key,
            description: DEMO_CONFIG_DESCRIPTIONS[key],
            decision: decisions[key],
            kind: "config",
          }))}
        />
      </section>
    </div>
  );
}
