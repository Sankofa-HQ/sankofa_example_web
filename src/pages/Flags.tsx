import { useEffect, useMemo, useState } from "react";
import { Sankofa } from "@sankofa/browser";
import {
  getSwitch,
  type FlagDecision,
  type SankofaSwitchAPI,
} from "@sankofa/switch";
import { getConfig, type ItemDecision, type SankofaConfigAPI } from "@sankofa/config";
import {
  DEMO_FLAGS,
  DEMO_CONFIG,
  DEMO_FLAG_DEFAULTS,
  DEMO_CONFIG_DEFAULTS,
  DEMO_FLAG_DESCRIPTIONS,
  type PricingTier,
  type ThemeColors,
} from "../sankofaDemo";
import { useSankofa } from "../lib/SankofaProvider";
import { DecisionTable } from "../components/DecisionTable";

export function FlagsPage() {
  const sankofa = useSankofa();
  const ready = sankofa.status === "ready";
  const switchApi = ready ? getSwitch() : null;
  const configApi = ready ? getConfig() : null;

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

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Sankofa.flush({ reason: "manual" });
      sankofa.refresh();
      bump();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="page">
      <section className="panel hero-sub">
        <p className="eyebrow">Switch · Feature flags</p>
        <h2>Decisions, evaluated server-side. Refreshable on demand.</h2>
        <p className="lede">
          Flags arrive in the handshake and are cached locally. The dashboard
          can flip a flag and the next refresh propagates here without a
          reload. The preview cards below depend on these values.
        </p>
      </section>

      <AppliedPreview
        flags={flagDecisions}
        config={configDecisions}
        switchApi={switchApi}
        configApi={configApi}
      />

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Live flag decisions</h3>
            <p className="muted">
              Every demo flag below is subscribed via{" "}
              <code>switchApi.onChange()</code>.
            </p>
          </div>
          <button
            className="secondary"
            disabled={!ready || refreshing}
            onClick={handleRefresh}
          >
            {refreshing ? "Refreshing…" : "Refresh handshake"}
          </button>
        </div>
        <DecisionTable
          rows={Object.values(DEMO_FLAGS).map((key) => ({
            key,
            description: DEMO_FLAG_DESCRIPTIONS[key],
            decision: flagDecisions[key],
            kind: "flag",
          }))}
        />
      </section>
    </div>
  );
}

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
    ctaVariant === "blue"
      ? "Try it free"
      : ctaVariant === "red"
        ? "Upgrade now"
        : "Get started";
  const ctaBg =
    ctaVariant === "blue"
      ? "#2563eb"
      : ctaVariant === "red"
        ? "#dc2626"
        : theme?.primary || "#e11d48";
  const tiersOrdered = pricingArm === "B" ? [...tiers].reverse() : tiers;

  const handleCtaClick = () =>
    switchApi?.getVariant(DEMO_FLAGS.CHECKOUT_CTA_VARIANT, "control");
  const handleUpload = () =>
    switchApi?.getFlag(DEMO_FLAGS.ONBOARDING_V2_ROLLOUT, false);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>Live preview — flags in action</h3>
          <p className="muted">
            Every card is driven by the current flag/config decisions.
          </p>
        </div>
      </div>

      {maintenance && (
        <div className="callout warn">
          ⚠ Maintenance window in progress — some features may be slow.
        </div>
      )}

      <div className="preview-grid">
        <div
          className="preview-card"
          style={{
            border: `1px solid ${theme?.accent || "#6366f1"}55`,
            background: newHome
              ? `linear-gradient(135deg, ${theme?.primary || "#e11d48"}22, ${theme?.accent || "#6366f1"}22)`
              : undefined,
          }}
        >
          <div className="preview-eyebrow">
            {newHome ? "Hero v2 — experimental" : "Hero — classic"}
          </div>
          <h4>
            {newHome ? "Build analytics for modern teams" : "Ship analytics in minutes"}
          </h4>
          <p className="muted small">
            Driven by <code>new_home_layout</code> and <code>theme_colors</code>.
          </p>
          <button
            onClick={handleCtaClick}
            style={{ background: ctaBg, marginTop: 12 }}
          >
            {ctaLabel} →
          </button>
          <p className="muted x-small">
            CTA variant: <strong>{ctaVariant}</strong>
          </p>
        </div>

        <div className="preview-card">
          <div className="preview-eyebrow">AI summary</div>
          {aiHalted ? (
            <>
              <h4 style={{ color: "#fca5a5" }}>🛑 Paused</h4>
              <p className="muted small">
                <code>ai_summary_kill_switch</code> halted. Halt webhooks or
                manual overrides flip this instantly.
              </p>
            </>
          ) : (
            <>
              <h4>Ready for queries</h4>
              <p className="muted small">
                Kill switch clear — the AI assistant would be available here.
              </p>
            </>
          )}
        </div>

        <div className="preview-card">
          <div className="preview-eyebrow">Uploads</div>
          <h4>Daily quota: {maxUploads} uploads</h4>
          <button
            onClick={handleUpload}
            disabled={!onboardingV2}
            className="secondary"
            style={{ marginTop: 12 }}
          >
            {onboardingV2 ? "Open uploader (v2)" : "Uploader coming soon"}
          </button>
          <p className="muted x-small">
            Gated by <code>onboarding_v2_rollout</code>.
          </p>
        </div>

        <div className="preview-card preview-card-wide">
          <div className="preview-row">
            <div>
              <div className="preview-eyebrow">
                Pricing — experiment arm {pricingArm}
              </div>
              <h4>
                {pricingArm === "B"
                  ? "Enterprise-first pricing"
                  : "Simple pricing, scales with you"}
              </h4>
            </div>
            {premiumBadge && (
              <span
                className="pill"
                style={{
                  background: `${theme?.primary || "#e11d48"}22`,
                  color: theme?.primary || "#e11d48",
                  border: `1px solid ${theme?.primary || "#e11d48"}55`,
                }}
              >
                ✦ Premium
              </span>
            )}
          </div>
          <div className="tier-grid">
            {tiersOrdered.map((tier) => {
              const discounted = Math.max(0, tier.price * (1 - (discount || 0)));
              return (
                <div key={tier.name} className="tier-card">
                  <strong>{tier.name}</strong>
                  <div
                    className="tier-price"
                    style={{ color: theme?.primary || "#e11d48" }}
                  >
                    ${discounted.toFixed(0)}
                    <span className="muted small">/mo</span>
                  </div>
                  {discount > 0 && tier.price > 0 && (
                    <div className="tier-discount">
                      {(discount * 100).toFixed(0)}% off trial
                    </div>
                  )}
                  <ul>
                    {tier.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="preview-card">
          <div className="preview-eyebrow">Support</div>
          <h4>Need help?</h4>
          <a
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => configApi?.get(DEMO_CONFIG.SUPPORT_URL, "")}
            style={{ color: theme?.accent || "#6366f1" }}
          >
            {supportUrl} ↗
          </a>
          <p className="muted x-small">
            From <code>support_url</code>.
          </p>
        </div>
      </div>
    </section>
  );
}
