import { useEffect, useMemo, useState } from "react";
import { getSwitch, type FlagDecision, type SankofaSwitchAPI } from "@sankofa/switch";
import { getConfig, type ItemDecision, type SankofaConfigAPI } from "@sankofa/config";
import {
  DEMO_FLAGS,
  DEMO_CONFIG,
  DEMO_FLAG_DEFAULTS,
  DEMO_CONFIG_DEFAULTS,
  DEMO_FLAG_DESCRIPTIONS,
  DEMO_CONFIG_DESCRIPTIONS,
  type PricingTier,
  type ThemeColors,
} from "./sankofaDemo";

interface Props {
  ready: boolean;
  onRefresh: () => Promise<void>;
}

/**
 * Lab panel — a self-contained visual for every canonical demo flag
 * and config item. Organised as three stacked sections so the screen
 * reads top-to-bottom like a story:
 *   1) Applied — shows the flags/config actually affecting the UI above
 *   2) Flags   — tabular inspection of all 6 demo flags
 *   3) Config  — tabular inspection of all 6 demo config items
 *
 * The panel subscribes to onChange for every demo key so it re-renders
 * live when a dashboard edit lands on the next handshake refresh.
 */
export function FlagsLabPanel({ ready, onRefresh }: Props) {
  const switchApi = ready ? getSwitch() : null;
  const configApi = ready ? getConfig() : null;

  // Bump to force re-render when any subscribed flag/config changes.
  const [rev, setRev] = useState(0);
  const bump = () => setRev((n) => n + 1);

  useEffect(() => {
    if (!switchApi || !configApi) return;
    const unsub: Array<() => void> = [];
    for (const key of Object.values(DEMO_FLAGS)) {
      unsub.push(switchApi.onChange(key, bump));
    }
    for (const key of Object.values(DEMO_CONFIG)) {
      unsub.push(configApi.onChange(key, bump));
    }
    return () => {
      for (const u of unsub) u();
    };
  }, [switchApi, configApi]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      bump();
    } finally {
      setRefreshing(false);
    }
  };

  // Snapshot every demo key on every render. Cheap because it's a
  // local map lookup — no network, no parsing.
  const flagDecisions = useMemo(() => {
    return Object.values(DEMO_FLAGS).reduce<Record<string, FlagDecision>>((acc, key) => {
      acc[key] = switchApi?.getDecision(key) ?? DEMO_FLAG_DEFAULTS[key];
      return acc;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchApi, rev]);

  const configDecisions = useMemo(() => {
    return Object.values(DEMO_CONFIG).reduce<Record<string, ItemDecision>>((acc, key) => {
      acc[key] = configApi?.getDecision(key) ?? DEMO_CONFIG_DEFAULTS[key];
      return acc;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configApi, rev]);

  return (
    <>
      <AppliedPreview
        flags={flagDecisions}
        config={configDecisions}
        switchApi={switchApi}
        configApi={configApi}
      />

      <section className="panel">
        <div className="snapshot-header">
          <div>
            <h2 style={{ margin: 0 }}>Sankofa Switch — live flag decisions</h2>
            <p className="lede" style={{ marginTop: 8, marginBottom: 0, fontSize: "0.95rem" }}>
              Every flag below is evaluated at handshake time, cached locally, and refreshed on
              demand. Dashboard edits propagate via <code>applyHandshake</code>.
            </p>
          </div>
          <button
            className="secondary"
            onClick={handleRefresh}
            disabled={!ready || refreshing}
            style={{ padding: "10px 16px", fontSize: "0.85rem" }}
          >
            {refreshing ? "Refreshing…" : "Refresh handshake"}
          </button>
        </div>
        <DecisionTable
          rows={Object.values(DEMO_FLAGS).map((key) => ({
            key,
            description: DEMO_FLAG_DESCRIPTIONS[key],
            decision: flagDecisions[key],
            kind: "flag" as const,
          }))}
        />
      </section>

      <section className="panel">
        <div className="snapshot-header">
          <div>
            <h2 style={{ margin: 0 }}>Sankofa Config — typed remote values</h2>
            <p className="lede" style={{ marginTop: 8, marginBottom: 0, fontSize: "0.95rem" }}>
              Strings, ints, floats, booleans, and arbitrary JSON. Every row is rendered into at
              least one surface in the demo above.
            </p>
          </div>
        </div>
        <DecisionTable
          rows={Object.values(DEMO_CONFIG).map((key) => ({
            key,
            description: DEMO_CONFIG_DESCRIPTIONS[key],
            decision: configDecisions[key],
            kind: "config" as const,
          }))}
        />
      </section>
    </>
  );
}

// ─── Applied preview — flags + configs actually change UI ───────────────

function AppliedPreview({
  flags,
  config,
  switchApi,
  configApi,
}: {
  flags: Record<string, FlagDecision>;
  config: Record<string, ItemDecision>;
  switchApi: SankofaSwitchAPI | null;
  configApi: SankofaConfigAPI | null;
}) {
  const maintenance = config[DEMO_CONFIG.MAINTENANCE_BANNER_ENABLED]?.value as boolean;
  const supportUrl = config[DEMO_CONFIG.SUPPORT_URL]?.value as string;
  const maxUploads = config[DEMO_CONFIG.MAX_UPLOADS_PER_DAY]?.value as number;
  const discount = config[DEMO_CONFIG.TRIAL_DISCOUNT_PCT]?.value as number;
  const theme = config[DEMO_CONFIG.THEME_COLORS]?.value as ThemeColors;
  const tiers = (config[DEMO_CONFIG.PRICING_TABLE]?.value ?? []) as PricingTier[];

  const newHome = flags[DEMO_FLAGS.NEW_HOME_LAYOUT]?.value;
  const ctaVariant = flags[DEMO_FLAGS.CHECKOUT_CTA_VARIANT]?.variant ?? "control";
  const onboardingV2 = flags[DEMO_FLAGS.ONBOARDING_V2_ROLLOUT]?.value;
  const aiHalted = flags[DEMO_FLAGS.AI_SUMMARY_KILL_SWITCH]?.value;
  const pricingArm = flags[DEMO_FLAGS.AB_PRICING_PAGE]?.variant ?? "A";
  const premiumBadge = flags[DEMO_FLAGS.PREMIUM_BADGE_VISIBLE]?.value;

  const ctaLabel =
    ctaVariant === "blue" ? "Try it free" : ctaVariant === "red" ? "Upgrade now" : "Get started";
  const ctaBg =
    ctaVariant === "blue" ? "#2563eb" : ctaVariant === "red" ? "#dc2626" : theme?.primary || "#e11d48";

  const tiersOrdered = pricingArm === "B" ? [...tiers].reverse() : tiers;

  const handleCtaClick = () => {
    // Demonstrates the exposure path: getVariant() triggers an
    // exposure row to the server, so clicks land in flag_exposures
    // and feed experiment results.
    switchApi?.getVariant(DEMO_FLAGS.CHECKOUT_CTA_VARIANT, "control");
  };

  const handleUpload = () => {
    // Exercise onboarding_v2_rollout exposure on user action.
    switchApi?.getFlag(DEMO_FLAGS.ONBOARDING_V2_ROLLOUT, false);
  };

  return (
    <section className="panel">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>Live preview — flags in action</h2>
        <p className="lede" style={{ fontSize: "0.95rem", marginBottom: 0 }}>
          Every card below is rendered from the current flag + config decisions. Flip a value in
          the dashboard and the next refresh will repaint this section without reload.
        </p>
      </div>

      {maintenance && (
        <div
          style={{
            background: "#f59e0b1f",
            border: "1px solid #f59e0b",
            color: "#fbbf24",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          ⚠️ Maintenance window in progress — some features may be slow.
        </div>
      )}

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}
      >
        {/* Hero card */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            border: `1px solid ${theme?.accent || "#6366f1"}55`,
            background: newHome
              ? `linear-gradient(135deg, ${theme?.primary || "#e11d48"}22, ${theme?.accent || "#6366f1"}22)`
              : "rgba(15,23,42,0.35)",
          }}
        >
          <div style={{ fontSize: "0.75rem", opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>
            {newHome ? "Hero layout: v2 — experimental" : "Hero layout: classic"}
          </div>
          <h3 style={{ margin: "10px 0 8px", fontSize: "1.2rem" }}>
            {newHome ? "Build analytics for modern teams" : "Ship analytics in minutes"}
          </h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Driven by <code>new_home_layout</code> and <code>theme_colors</code>.
          </p>
          <button
            onClick={handleCtaClick}
            style={{
              marginTop: 14,
              background: ctaBg,
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {ctaLabel} →
          </button>
          <p style={{ marginTop: 10, fontSize: "0.75rem", opacity: 0.5 }}>
            CTA variant: <strong>{ctaVariant}</strong>
          </p>
        </div>

        {/* AI summary card — kill switch demo */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            border: "1px solid #ffffff14",
            background: "rgba(15,23,42,0.35)",
          }}
        >
          <div style={{ fontSize: "0.75rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
            AI summary
          </div>
          {aiHalted ? (
            <>
              <h3 style={{ margin: "10px 0 8px", fontSize: "1.05rem", color: "#fca5a5" }}>
                🛑 Paused
              </h3>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                The <code>ai_summary_kill_switch</code> flag is halted. Halt webhooks or manual
                dashboard overrides flip this instantly.
              </p>
            </>
          ) : (
            <>
              <h3 style={{ margin: "10px 0 8px", fontSize: "1.05rem" }}>Ready for queries</h3>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                Kill switch clear — the AI assistant would be available here.
              </p>
            </>
          )}
        </div>

        {/* Upload card */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            border: "1px solid #ffffff14",
            background: "rgba(15,23,42,0.35)",
          }}
        >
          <div style={{ fontSize: "0.75rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
            Uploads
          </div>
          <h3 style={{ margin: "10px 0 8px", fontSize: "1.05rem" }}>
            Daily quota: {maxUploads} uploads
          </h3>
          <button
            onClick={handleUpload}
            disabled={!onboardingV2}
            style={{
              background: onboardingV2 ? theme?.accent || "#6366f1" : "#374151",
              color: "white",
              border: "none",
              padding: "9px 14px",
              borderRadius: 10,
              fontWeight: 600,
              cursor: onboardingV2 ? "pointer" : "not-allowed",
            }}
          >
            {onboardingV2 ? "Open uploader (v2)" : "Uploader coming soon"}
          </button>
          <p style={{ marginTop: 10, fontSize: "0.75rem", opacity: 0.5 }}>
            Gated by <code>onboarding_v2_rollout</code>. Limit from{" "}
            <code>max_uploads_per_day</code>.
          </p>
        </div>

        {/* Pricing card — variant + discount + json tiers */}
        <div
          style={{
            gridColumn: "1 / -1",
            padding: 20,
            borderRadius: 14,
            border: `1px solid ${theme?.primary || "#e11d48"}33`,
            background: "rgba(15,23,42,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
                Pricing — experiment arm {pricingArm}
              </div>
              <h3 style={{ margin: "6px 0 0", fontSize: "1.15rem" }}>
                {pricingArm === "B"
                  ? "Enterprise-first pricing"
                  : "Simple pricing, scales with you"}
              </h3>
            </div>
            {premiumBadge && (
              <span
                style={{
                  background: `${theme?.primary || "#e11d48"}22`,
                  color: theme?.primary || "#e11d48",
                  border: `1px solid ${theme?.primary || "#e11d48"}55`,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                ✨ Premium
              </span>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            {tiersOrdered.map((tier) => {
              const discounted = Math.max(0, tier.price * (1 - (discount || 0)));
              return (
                <div
                  key={tier.name}
                  style={{
                    border: "1px solid #ffffff1a",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>{tier.name}</div>
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      marginTop: 4,
                      color: theme?.primary || "#e11d48",
                    }}
                  >
                    ${discounted.toFixed(0)}
                    <span style={{ fontSize: "0.75rem", marginLeft: 4, color: "var(--text-muted)", fontWeight: 500 }}>
                      /mo
                    </span>
                  </div>
                  {discount > 0 && tier.price > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "#fbbf24", marginTop: 2 }}>
                      {(discount * 100).toFixed(0)}% off trial
                    </div>
                  )}
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {tier.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Support link — string config */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            border: "1px solid #ffffff14",
            background: "rgba(15,23,42,0.35)",
          }}
        >
          <div style={{ fontSize: "0.75rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
            Support
          </div>
          <h3 style={{ margin: "10px 0 8px", fontSize: "1.05rem" }}>Need help?</h3>
          <a
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => configApi?.get(DEMO_CONFIG.SUPPORT_URL, "")}
            style={{ color: theme?.accent || "#6366f1", fontWeight: 600, fontSize: "0.9rem" }}
          >
            {supportUrl} ↗
          </a>
          <p style={{ marginTop: 10, fontSize: "0.75rem", opacity: 0.5 }}>
            From <code>support_url</code>.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Decision table ─────────────────────────────────────────────────────

interface Row {
  key: string;
  description: string;
  decision: FlagDecision | ItemDecision;
  kind: "flag" | "config";
}

function DecisionTable({ rows }: { rows: Row[] }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        marginTop: 16,
      }}
    >
      {rows.map((row) => (
        <div
          key={row.key}
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 140px 80px",
            alignItems: "center",
            gap: 16,
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(15,23,42,0.35)",
            border: "1px solid #ffffff0f",
          }}
        >
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.92rem" }}>{row.key}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 3 }}>
              {row.description}
            </div>
          </div>
          <div>
            <ValueRender decision={row.decision} kind={row.kind} />
          </div>
          <div style={{ fontSize: "0.75rem" }}>
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: reasonBg(row.decision.reason),
                color: reasonFg(row.decision.reason),
                fontFamily: "monospace",
                letterSpacing: 0.2,
              }}
            >
              {row.decision.reason}
            </span>
          </div>
          <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: "0.8rem", opacity: 0.7 }}>
            v{row.decision.version}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValueRender({ decision, kind }: { decision: FlagDecision | ItemDecision; kind: "flag" | "config" }) {
  if (kind === "flag") {
    const d = decision as FlagDecision;
    if (d.variant) {
      return (
        <span style={{ fontFamily: "monospace" }}>
          <strong style={{ color: "#fda4af" }}>{d.variant}</strong>{" "}
          <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>
            (value: {String(d.value)})
          </span>
        </span>
      );
    }
    return (
      <span style={{ fontFamily: "monospace", color: d.value ? "#86efac" : "#fda4af" }}>
        {String(d.value)}
      </span>
    );
  }
  const d = decision as ItemDecision;
  if (d.type === "json") {
    return (
      <code style={{ fontSize: "0.75rem", opacity: 0.8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {JSON.stringify(d.value)}
      </code>
    );
  }
  return (
    <span style={{ fontFamily: "monospace" }}>
      {typeof d.value === "string" ? `"${d.value}"` : String(d.value)}
      <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: "0.75rem" }}>({d.type})</span>
    </span>
  );
}

function reasonBg(reason: string): string {
  if (reason === "halted") return "#dc262622";
  if (reason === "rollout" || reason === "rule_matched") return "#10b98122";
  if (reason === "local_default") return "#ffffff0c";
  if (reason.startsWith("not_in") || reason.startsWith("in_excluded")) return "#f59e0b22";
  return "#6366f122";
}
function reasonFg(reason: string): string {
  if (reason === "halted") return "#fca5a5";
  if (reason === "rollout" || reason === "rule_matched") return "#86efac";
  if (reason === "local_default") return "var(--text-muted)";
  if (reason.startsWith("not_in") || reason.startsWith("in_excluded")) return "#fcd34d";
  return "#a5b4fc";
}
