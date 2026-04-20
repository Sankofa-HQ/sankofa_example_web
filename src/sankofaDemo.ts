import type { FlagDecision } from "@sankofa/switch";
import type { ItemDecision } from "@sankofa/config";

// Canonical demo keys — shared verbatim across every Sankofa example
// (web, react-native, html, ios, android, flutter) so one dashboard
// config row drives every platform. Changing a key here without
// updating the dashboard side means the example falls back to local
// defaults, which is a useful "offline" mode too.

export const DEMO_FLAGS = {
  NEW_HOME_LAYOUT: "new_home_layout",
  CHECKOUT_CTA_VARIANT: "checkout_cta_variant",
  ONBOARDING_V2_ROLLOUT: "onboarding_v2_rollout",
  AI_SUMMARY_KILL_SWITCH: "ai_summary_kill_switch",
  AB_PRICING_PAGE: "ab_pricing_page",
  PREMIUM_BADGE_VISIBLE: "premium_badge_visible",
} as const;

export const DEMO_CONFIG = {
  SUPPORT_URL: "support_url",
  MAX_UPLOADS_PER_DAY: "max_uploads_per_day",
  TRIAL_DISCOUNT_PCT: "trial_discount_pct",
  MAINTENANCE_BANNER_ENABLED: "maintenance_banner_enabled",
  PRICING_TABLE: "pricing_table",
  THEME_COLORS: "theme_colors",
} as const;

export type PricingTier = { name: string; price: number; features: string[] };
export type ThemeColors = { primary: string; accent: string };

// Local defaults — rendered before the handshake completes and when
// the handshake never arrives (air-gapped / offline demo / project
// without the demo keys configured yet).
export const DEMO_FLAG_DEFAULTS: Record<string, FlagDecision> = {
  [DEMO_FLAGS.NEW_HOME_LAYOUT]: {
    value: false,
    reason: "local_default",
    version: 0,
  },
  [DEMO_FLAGS.CHECKOUT_CTA_VARIANT]: {
    value: true,
    variant: "control",
    reason: "local_default",
    version: 0,
  },
  [DEMO_FLAGS.ONBOARDING_V2_ROLLOUT]: {
    value: false,
    reason: "local_default",
    version: 0,
  },
  [DEMO_FLAGS.AI_SUMMARY_KILL_SWITCH]: {
    value: false,
    reason: "local_default",
    version: 0,
  },
  [DEMO_FLAGS.AB_PRICING_PAGE]: {
    value: true,
    variant: "A",
    reason: "local_default",
    version: 0,
  },
  [DEMO_FLAGS.PREMIUM_BADGE_VISIBLE]: {
    value: true,
    reason: "local_default",
    version: 0,
  },
};

export const DEMO_CONFIG_DEFAULTS: Record<string, ItemDecision> = {
  [DEMO_CONFIG.SUPPORT_URL]: {
    value: "https://support.sankofa.dev",
    type: "string",
    reason: "local_default",
    version: 0,
  },
  [DEMO_CONFIG.MAX_UPLOADS_PER_DAY]: {
    value: 25,
    type: "int",
    reason: "local_default",
    version: 0,
  },
  [DEMO_CONFIG.TRIAL_DISCOUNT_PCT]: {
    value: 0.2,
    type: "float",
    reason: "local_default",
    version: 0,
  },
  [DEMO_CONFIG.MAINTENANCE_BANNER_ENABLED]: {
    value: false,
    type: "bool",
    reason: "local_default",
    version: 0,
  },
  [DEMO_CONFIG.PRICING_TABLE]: {
    value: [
      { name: "Starter", price: 0, features: ["1 project", "1k events/mo"] },
      { name: "Pro", price: 49, features: ["Unlimited projects", "1M events/mo", "Replay"] },
      { name: "Enterprise", price: 199, features: ["SSO", "Priority support", "Audit log"] },
    ] as PricingTier[],
    type: "json",
    reason: "local_default",
    version: 0,
  },
  [DEMO_CONFIG.THEME_COLORS]: {
    value: { primary: "#e11d48", accent: "#6366f1" } as ThemeColors,
    type: "json",
    reason: "local_default",
    version: 0,
  },
};

// Descriptions — rendered in the Lab grid so readers understand the
// *intent* of each key without cross-referencing the dashboard.
export const DEMO_FLAG_DESCRIPTIONS: Record<string, string> = {
  [DEMO_FLAGS.NEW_HOME_LAYOUT]:
    "Swap hero between classic and experimental layout. Kill-switch style.",
  [DEMO_FLAGS.CHECKOUT_CTA_VARIANT]:
    "A/B/C variant controlling CTA copy + colour (control / blue / red).",
  [DEMO_FLAGS.ONBOARDING_V2_ROLLOUT]:
    "Progressive rollout boolean. Dashboard ramps via SwitchRollout.",
  [DEMO_FLAGS.AI_SUMMARY_KILL_SWITCH]:
    "Halt webhook flips this to true when Catch fires an error spike.",
  [DEMO_FLAGS.AB_PRICING_PAGE]:
    "Variant A/B on the pricing card copy + price order.",
  [DEMO_FLAGS.PREMIUM_BADGE_VISIBLE]:
    "Boolean gate for the sparkly Premium badge on identified users.",
};

export const DEMO_CONFIG_DESCRIPTIONS: Record<string, string> = {
  [DEMO_CONFIG.SUPPORT_URL]:
    "String — drives the Help link in the footer and lab panel.",
  [DEMO_CONFIG.MAX_UPLOADS_PER_DAY]:
    "Int — daily upload ceiling shown to the user on the upload card.",
  [DEMO_CONFIG.TRIAL_DISCOUNT_PCT]:
    "Float 0–1 — discount multiplier applied to every pricing tier.",
  [DEMO_CONFIG.MAINTENANCE_BANNER_ENABLED]:
    "Bool — shows the amber maintenance banner when true.",
  [DEMO_CONFIG.PRICING_TABLE]:
    "JSON — array of pricing tiers rendered into the pricing grid.",
  [DEMO_CONFIG.THEME_COLORS]:
    "JSON {primary, accent} — drives the accent + CTA colour tokens.",
};
