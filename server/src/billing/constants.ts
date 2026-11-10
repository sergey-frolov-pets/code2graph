/** Starter quotas from docs/BILLING_LAVA.md. Prices stay in lava, not here. */

export const BILLING_FREE_DIAGRAMS = 20;
export const BILLING_FREE_SECTIONS = 5;
export const BILLING_FREE_SHARE_LINKS = 3;
export const BILLING_FREE_SHARE_MAX_DAYS = 7;
export const BILLING_FREE_VERSIONS = 5;

export const BILLING_CLOUD_DIAGRAMS = 500;
export const BILLING_CLOUD_SECTIONS = 100;

export const BILLING_AI_MONTHLY_TOKENS = 300;
export const BILLING_TEAM_TOKENS_PER_SEAT = 300;
export const BILLING_PROMO_DAYS = 14;
export const BILLING_PROMO_TOKENS = 50;

export const BILLING_MONTH_DAYS = 30;
export const BILLING_YEAR_DAYS = 365;

export const BILLING_TOKEN_PACK_SIZES = [100, 500, 2000] as const;

export const BILLING_TOKEN_PACK_RATE_PER_MINUTE = 5;
export const BILLING_TOKEN_PACK_MAX_OUTPUT_TOKENS = 512;

export const BILLING_LLM_TOKEN_COST = 1;

export const BILLING_WELCOME_CAMPAIGN_ID = "campaign-welcome-cloud";

export const BILLING_MANUAL_REASONS = [
  "support_grant",
  "support_revoke",
  "enterprise_contract",
  "token_adjustment",
  "gift_revoke",
] as const;

export type BillingManualReason = (typeof BILLING_MANUAL_REASONS)[number];

export const BILLING_PACKAGES = ["cloud", "ai", "team", "enterprise"] as const;

export type BillingPackage = (typeof BILLING_PACKAGES)[number];

export const BILLING_ENTITLEMENT_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "gifted",
] as const;

export type BillingEntitlementStatus =
  (typeof BILLING_ENTITLEMENT_STATUSES)[number];

export const LAVA_EVENT_TYPES = [
  "payment.success",
  "payment.failed",
  "subscription.recurring.payment.success",
  "subscription.recurring.payment.failed",
  "subscription.cancelled",
  "refund.success",
  "chargeback.initiated",
] as const;

export type LavaEventType = (typeof LAVA_EVENT_TYPES)[number];

export const BILLING_OFFER_CODES = [
  "cloud_month",
  "cloud_year",
  "ai_month",
  "ai_year",
  "tokens_100",
  "tokens_500",
  "tokens_2000",
  "team_5_month",
  "team_5_year",
  "team_15_month",
  "team_15_year",
  "gift_cloud_month",
  "gift_cloud_year",
  "gift_tokens_100",
  "gift_team_month",
  "enterprise",
] as const;

export type BillingOfferCode = (typeof BILLING_OFFER_CODES)[number];

export interface BillingOfferDefinition {
  code: BillingOfferCode;
  packageName: BillingPackage | "tokens";
  kind: "subscription" | "tokens" | "gift" | "enterprise";
  period: "month" | "year" | "once";
  tokens: number;
  seats: number;
  durationDays: number;
  envKey: string;
}

export const BILLING_OFFER_DEFINITIONS: readonly BillingOfferDefinition[] = [
  { code: "cloud_month", packageName: "cloud", kind: "subscription", period: "month", tokens: 0, seats: 1, durationDays: BILLING_MONTH_DAYS, envKey: "LAVA_OFFER_CLOUD_MONTH" },
  { code: "cloud_year", packageName: "cloud", kind: "subscription", period: "year", tokens: 0, seats: 1, durationDays: BILLING_YEAR_DAYS, envKey: "LAVA_OFFER_CLOUD_YEAR" },
  { code: "ai_month", packageName: "ai", kind: "subscription", period: "month", tokens: BILLING_AI_MONTHLY_TOKENS, seats: 1, durationDays: BILLING_MONTH_DAYS, envKey: "LAVA_OFFER_AI_MONTH" },
  { code: "ai_year", packageName: "ai", kind: "subscription", period: "year", tokens: BILLING_AI_MONTHLY_TOKENS, seats: 1, durationDays: BILLING_YEAR_DAYS, envKey: "LAVA_OFFER_AI_YEAR" },
  { code: "tokens_100", packageName: "tokens", kind: "tokens", period: "once", tokens: 100, seats: 0, durationDays: 0, envKey: "LAVA_OFFER_TOKENS_100" },
  { code: "tokens_500", packageName: "tokens", kind: "tokens", period: "once", tokens: 500, seats: 0, durationDays: 0, envKey: "LAVA_OFFER_TOKENS_500" },
  { code: "tokens_2000", packageName: "tokens", kind: "tokens", period: "once", tokens: 2000, seats: 0, durationDays: 0, envKey: "LAVA_OFFER_TOKENS_2000" },
  { code: "team_5_month", packageName: "team", kind: "subscription", period: "month", tokens: BILLING_TEAM_TOKENS_PER_SEAT * 5, seats: 5, durationDays: BILLING_MONTH_DAYS, envKey: "LAVA_OFFER_TEAM_5_MONTH" },
  { code: "team_5_year", packageName: "team", kind: "subscription", period: "year", tokens: BILLING_TEAM_TOKENS_PER_SEAT * 5, seats: 5, durationDays: BILLING_YEAR_DAYS, envKey: "LAVA_OFFER_TEAM_5_YEAR" },
  { code: "team_15_month", packageName: "team", kind: "subscription", period: "month", tokens: BILLING_TEAM_TOKENS_PER_SEAT * 15, seats: 15, durationDays: BILLING_MONTH_DAYS, envKey: "LAVA_OFFER_TEAM_15_MONTH" },
  { code: "team_15_year", packageName: "team", kind: "subscription", period: "year", tokens: BILLING_TEAM_TOKENS_PER_SEAT * 15, seats: 15, durationDays: BILLING_YEAR_DAYS, envKey: "LAVA_OFFER_TEAM_15_YEAR" },
  { code: "gift_cloud_month", packageName: "cloud", kind: "gift", period: "month", tokens: 0, seats: 1, durationDays: BILLING_MONTH_DAYS, envKey: "LAVA_OFFER_GIFT_CLOUD_MONTH" },
  { code: "gift_cloud_year", packageName: "cloud", kind: "gift", period: "year", tokens: 0, seats: 1, durationDays: BILLING_YEAR_DAYS, envKey: "LAVA_OFFER_GIFT_CLOUD_YEAR" },
  { code: "gift_tokens_100", packageName: "tokens", kind: "gift", period: "once", tokens: 100, seats: 0, durationDays: 0, envKey: "LAVA_OFFER_GIFT_TOKENS_100" },
  { code: "gift_team_month", packageName: "team", kind: "gift", period: "month", tokens: BILLING_TEAM_TOKENS_PER_SEAT * 5, seats: 5, durationDays: BILLING_MONTH_DAYS, envKey: "LAVA_OFFER_GIFT_TEAM_MONTH" },
  { code: "enterprise", packageName: "enterprise", kind: "enterprise", period: "once", tokens: 0, seats: 0, durationDays: 0, envKey: "LAVA_OFFER_ENTERPRISE" },
];

export function isBillingOfferCode(value: string): value is BillingOfferCode {
  return (BILLING_OFFER_CODES as readonly string[]).includes(value);
}

export function isBillingManualReason(value: string): value is BillingManualReason {
  return (BILLING_MANUAL_REASONS as readonly string[]).includes(value);
}
