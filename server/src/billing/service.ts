import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type Database from "better-sqlite3";
import {
  BILLING_MANUAL_REASONS,
  type BillingEntitlementStatus,
  type BillingManualReason,
  type BillingOfferCode,
  type BillingPackage,
} from "./constants.js";
import { lavaNoticeKey, readLavaNotice, type LavaNotice } from "./lava-notice.js";

const ACTIVE_STATUSES = ["trialing", "active", "past_due", "gifted"] as const;

export interface OfferRow {
  code: string;
  package_name: string;
  kind: string;
  period: string;
  tokens: number;
  seats: number;
  duration_days: number;
  offer_id: string | null;
}

export function billingTablesReady(database: Database.Database): boolean {
  const row = database
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'billing_accounts'",
    )
    .get();
  return Boolean(row);
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateSecretCode(): string {
  return randomBytes(16).toString("base64url");
}

export function secretsMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function addDays(from: Date, days: number): string {
  const next = new Date(from.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

export function ensureAccount(database: Database.Database, userId: string): void {
  database
    .prepare(
      `INSERT INTO billing_accounts (user_id, included_balance, purchased_balance, included_until, updated_at)
       VALUES (?, 0, 0, NULL, ?)
       ON CONFLICT(user_id) DO NOTHING`,
    )
    .run(userId, new Date().toISOString());
}

export function getOffer(database: Database.Database, code: string): OfferRow | null {
  const row = database
    .prepare(
      `SELECT code, package_name, kind, period, tokens, seats, duration_days, offer_id
       FROM billing_offers WHERE code = ?`,
    )
    .get(code) as OfferRow | undefined;
  return row ?? null;
}

export function listOffers(database: Database.Database): OfferRow[] {
  return database
    .prepare(
      `SELECT code, package_name, kind, period, tokens, seats, duration_days, offer_id
       FROM billing_offers ORDER BY code ASC`,
    )
    .all() as OfferRow[];
}

function expireIncluded(database: Database.Database, userId: string, now: Date): void {
  ensureAccount(database, userId);
  const row = database
    .prepare(
      `SELECT included_balance, included_until FROM billing_accounts WHERE user_id = ?`,
    )
    .get(userId) as { included_balance: number; included_until: string | null };
  if (row.included_until && new Date(row.included_until).getTime() <= now.getTime() && row.included_balance > 0) {
    database
      .prepare(
        `UPDATE billing_accounts
         SET included_balance = 0, updated_at = ?
         WHERE user_id = ?`,
      )
      .run(now.toISOString(), userId);
    database
      .prepare(
        `INSERT INTO token_ledger (
          id, user_id, organization_id, bucket, amount, entry_type, request_id, contract_id, created_at
        ) VALUES (?, ?, NULL, 'included', ?, 'expire', NULL, NULL, ?)`,
      )
      .run(randomUUID(), userId, -row.included_balance, now.toISOString());
  }
}

export function readBalances(
  database: Database.Database,
  userId: string,
  now = new Date(),
): { included: number; purchased: number } {
  if (!billingTablesReady(database)) {
    return { included: 0, purchased: 0 };
  }
  expireIncluded(database, userId, now);
  const row = database
    .prepare(
      `SELECT included_balance, purchased_balance FROM billing_accounts WHERE user_id = ?`,
    )
    .get(userId) as { included_balance: number; purchased_balance: number };
  return { included: row.included_balance, purchased: row.purchased_balance };
}

export function grantIncludedTokens(
  database: Database.Database,
  userId: string,
  amount: number,
  until: string,
  contractId: string | null,
): void {
  ensureAccount(database, userId);
  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE billing_accounts
       SET included_balance = ?, included_until = ?, updated_at = ?
       WHERE user_id = ?`,
    )
    .run(amount, until, now, userId);
  database
    .prepare(
      `INSERT INTO token_ledger (
        id, user_id, organization_id, bucket, amount, entry_type, request_id, contract_id, created_at
      ) VALUES (?, ?, NULL, 'included', ?, 'grant', NULL, ?, ?)`,
    )
    .run(randomUUID(), userId, amount, contractId, now);
}

export function addPurchasedTokens(
  database: Database.Database,
  userId: string,
  amount: number,
  contractId: string | null,
  entryType: "purchase" | "gift",
): void {
  ensureAccount(database, userId);
  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE billing_accounts
       SET purchased_balance = purchased_balance + ?, updated_at = ?
       WHERE user_id = ?`,
    )
    .run(amount, now, userId);
  database
    .prepare(
      `INSERT INTO token_ledger (
        id, user_id, organization_id, bucket, amount, entry_type, request_id, contract_id, created_at
      ) VALUES (?, ?, NULL, 'purchased', ?, ?, NULL, ?, ?)`,
    )
    .run(randomUUID(), userId, amount, entryType, contractId, now);
}

export function debitTokens(
  database: Database.Database,
  userId: string,
  cost: number,
  requestId: string,
): boolean {
  const existing = database
    .prepare("SELECT id FROM token_ledger WHERE request_id = ?")
    .get(requestId);
  if (existing) {
    return true;
  }

  const now = new Date();
  const balances = readBalances(database, userId, now);
  const bucket = balances.included >= cost
    ? "included"
    : balances.purchased >= cost
      ? "purchased"
      : null;
  if (!bucket) {
    return false;
  }

  const column = bucket === "included" ? "included_balance" : "purchased_balance";
  database
    .prepare(
      `UPDATE billing_accounts SET ${column} = ${column} - ?, updated_at = ? WHERE user_id = ?`,
    )
    .run(cost, now.toISOString(), userId);
  database
    .prepare(
      `INSERT INTO token_ledger (
        id, user_id, organization_id, bucket, amount, entry_type, request_id, contract_id, created_at
      ) VALUES (?, ?, NULL, ?, ?, 'debit', ?, NULL, ?)`,
    )
    .run(randomUUID(), userId, bucket, -cost, requestId, now.toISOString());
  return true;
}

export function hasActivePackage(
  database: Database.Database,
  userId: string,
  packageName: BillingPackage,
  now = new Date(),
): boolean {
  if (!billingTablesReady(database)) {
    return false;
  }
  const rows = database
    .prepare(
      `SELECT status, period_end FROM billing_entitlements
       WHERE user_id = ? AND package_name = ?`,
    )
    .all(userId, packageName) as Array<{ status: string; period_end: string | null }>;

  return rows.some((row) => {
    if (!(ACTIVE_STATUSES as readonly string[]).includes(row.status)) {
      return false;
    }
    if (!row.period_end) {
      return true;
    }
    return new Date(row.period_end).getTime() > now.getTime();
  });
}

export function userHasTeamSeat(
  database: Database.Database,
  userId: string,
  now = new Date(),
): boolean {
  if (!billingTablesReady(database)) {
    return false;
  }
  const membership = database
    .prepare(
      `SELECT organization_id FROM organization_members WHERE user_id = ?`,
    )
    .get(userId) as { organization_id: string } | undefined;
  if (!membership) {
    return false;
  }
  const org = database
    .prepare("SELECT owner_user_id FROM organizations WHERE id = ?")
    .get(membership.organization_id) as { owner_user_id: string } | undefined;
  if (!org) {
    return false;
  }
  return hasActivePackage(database, org.owner_user_id, "team", now);
}

export function userHasCloudAccess(database: Database.Database, userId: string): boolean {
  return hasActivePackage(database, userId, "cloud")
    || hasActivePackage(database, userId, "team")
    || hasActivePackage(database, userId, "enterprise")
    || userHasTeamSeat(database, userId);
}

export function userHasAiAccess(database: Database.Database, userId: string): boolean {
  return hasActivePackage(database, userId, "ai")
    || hasActivePackage(database, userId, "team")
    || hasActivePackage(database, userId, "enterprise")
    || userHasTeamSeat(database, userId);
}

export function upsertEntitlement(
  database: Database.Database,
  input: {
    userId: string;
    packageName: BillingPackage;
    status: BillingEntitlementStatus;
    periodEnd: string | null;
    contractId: string | null;
    offerCode: string | null;
    source: string;
  },
): void {
  const now = new Date().toISOString();
  const current = database
    .prepare(
      `SELECT id FROM billing_entitlements
       WHERE user_id = ? AND package_name = ? AND source = ?
       ORDER BY updated_at DESC LIMIT 1`,
    )
    .get(input.userId, input.packageName, input.source) as { id: string } | undefined;

  if (current) {
    database
      .prepare(
        `UPDATE billing_entitlements
         SET status = ?, period_end = ?, contract_id = ?, offer_code = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.status,
        input.periodEnd,
        input.contractId,
        input.offerCode,
        now,
        current.id,
      );
    return;
  }

  database
    .prepare(
      `INSERT INTO billing_entitlements (
        id, user_id, package_name, status, period_end, contract_id, offer_code, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      input.userId,
      input.packageName,
      input.status,
      input.periodEnd,
      input.contractId,
      input.offerCode,
      input.source,
      now,
      now,
    );
}

export function applyNewAccountCampaigns(database: Database.Database, userId: string): void {
  const now = new Date();
  const campaigns = database
    .prepare(
      `SELECT id, package_name, duration_days, tokens
       FROM billing_campaigns
       WHERE status = 'running' AND audience = 'new_accounts'
         AND starts_at <= ?
         AND (ends_at IS NULL OR ends_at > ?)`,
    )
    .all(now.toISOString(), now.toISOString()) as Array<{
    id: string;
    package_name: string | null;
    duration_days: number;
    tokens: number;
  }>;

  for (const campaign of campaigns) {
    const inserted = database
      .prepare(
        `INSERT INTO billing_campaign_grants (id, campaign_id, user_id, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(campaign_id, user_id) DO NOTHING`,
      )
      .run(randomUUID(), campaign.id, userId, now.toISOString());
    if (inserted.changes === 0) {
      continue;
    }
    if (campaign.package_name === "cloud" && campaign.duration_days > 0) {
      upsertEntitlement(database, {
        userId,
        packageName: "cloud",
        status: "trialing",
        periodEnd: addDays(now, campaign.duration_days),
        contractId: null,
        offerCode: null,
        source: `campaign:${campaign.id}`,
      });
    }
    if (campaign.tokens > 0) {
      grantIncludedTokens(
        database,
        userId,
        campaign.tokens,
        addDays(now, campaign.duration_days || BILLING_PROMO_DAYS_FALLBACK),
        null,
      );
    }
  }
}

const BILLING_PROMO_DAYS_FALLBACK = 14;

function applyPaidOffer(
  database: Database.Database,
  userId: string,
  offer: OfferRow,
  contractId: string,
): void {
  const now = new Date();
  const periodEnd = offer.duration_days > 0 ? addDays(now, offer.duration_days) : null;

  if (offer.kind === "tokens") {
    addPurchasedTokens(database, userId, offer.tokens, contractId, "purchase");
    return;
  }

  if (offer.kind === "gift") {
    return;
  }

  if (offer.package_name === "cloud" || offer.package_name === "ai" || offer.package_name === "team" || offer.package_name === "enterprise") {
    upsertEntitlement(database, {
      userId,
      packageName: offer.package_name,
      status: "active",
      periodEnd,
      contractId,
      offerCode: offer.code,
      source: "purchase",
    });
  }

  if (offer.tokens > 0 && periodEnd) {
    grantIncludedTokens(database, userId, offer.tokens, periodEnd, contractId);
  }

  if (offer.package_name === "team" && offer.seats > 0) {
    ensureOrganization(database, userId, offer.seats);
  }
}

export function ensureOrganization(
  database: Database.Database,
  ownerUserId: string,
  seatLimit: number,
): string {
  const existing = database
    .prepare("SELECT id FROM organizations WHERE owner_user_id = ?")
    .get(ownerUserId) as { id: string } | undefined;
  const now = new Date().toISOString();
  if (existing) {
    database
      .prepare("UPDATE organizations SET seat_limit = ? WHERE id = ?")
      .run(seatLimit, existing.id);
    return existing.id;
  }
  const id = randomUUID();
  database
    .prepare(
      `INSERT INTO organizations (
        id, title, owner_user_id, seat_limit, included_balance, purchased_balance, included_until, created_at
      ) VALUES (?, ?, ?, ?, 0, 0, NULL, ?)`,
    )
    .run(id, "Команда", ownerUserId, seatLimit, now);
  database
    .prepare(
      `INSERT INTO organization_members (organization_id, user_id, role, created_at)
       VALUES (?, ?, 'owner', ?)`,
    )
    .run(id, ownerUserId, now);
  return id;
}

export function createCheckout(
  database: Database.Database,
  userId: string,
  offerCode: BillingOfferCode,
  lavaInvoiceId: string | null,
): { id: string; giftCode: string | null } {
  const offer = getOffer(database, offerCode);
  if (!offer) {
    throw new Error("offer_missing");
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO billing_checkouts (id, user_id, offer_code, lava_invoice_id, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
    .run(id, userId, offerCode, lavaInvoiceId, now);

  if (offer.kind !== "gift") {
    return { id, giftCode: null };
  }

  const giftCode = generateSecretCode();
  database
    .prepare(
      `INSERT INTO gift_grants (
        id, code_hash, code_once, checkout_id, purchaser_user_id, redeemer_user_id,
        offer_code, status, created_at, redeemed_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, 'pending', ?, NULL)`,
    )
    .run(randomUUID(), hashSecret(giftCode), giftCode, id, userId, offerCode, now);
  return { id, giftCode };
}

export function attachInvoiceId(
  database: Database.Database,
  checkoutId: string,
  lavaInvoiceId: string,
): void {
  database
    .prepare("UPDATE billing_checkouts SET lava_invoice_id = ? WHERE id = ?")
    .run(lavaInvoiceId, checkoutId);
}

export function readCheckoutForBuyer(
  database: Database.Database,
  checkoutId: string,
  userId: string,
): { status: string; code: string | null } | null {
  const checkout = database
    .prepare(
      `SELECT status FROM billing_checkouts WHERE id = ? AND user_id = ?`,
    )
    .get(checkoutId, userId) as { status: string } | undefined;
  if (!checkout) {
    return null;
  }
  if (checkout.status !== "paid") {
    return { status: checkout.status, code: null };
  }
  const gift = database
    .prepare(
      `SELECT id, code_once FROM gift_grants WHERE checkout_id = ?`,
    )
    .get(checkoutId) as { id: string; code_once: string | null } | undefined;
  if (!gift?.code_once) {
    return { status: checkout.status, code: null };
  }
  database.prepare("UPDATE gift_grants SET code_once = NULL WHERE id = ?").run(gift.id);
  return { status: checkout.status, code: gift.code_once };
}

function findCheckoutByNotice(
  database: Database.Database,
  notice: LavaNotice,
): { id: string; user_id: string; offer_code: string; status: string } | null {
  const ids = [notice.invoiceId, notice.contractId].filter((value): value is string => Boolean(value));
  for (const id of ids) {
    const row = database
      .prepare(
        `SELECT id, user_id, offer_code, status FROM billing_checkouts WHERE lava_invoice_id = ?`,
      )
      .get(id) as { id: string; user_id: string; offer_code: string; status: string } | undefined;
    if (row) {
      return row;
    }
  }
  return null;
}

export function applyLavaNotice(database: Database.Database, body: unknown): "applied" | "ignored" | "duplicate" {
  const notice = readLavaNotice(body);
  if (!notice) {
    return "ignored";
  }

  const key = lavaNoticeKey(notice);
  const now = new Date().toISOString();
  const inserted = database
    .prepare(
      `INSERT INTO lava_events (
        id, idempotency_key, event_type, contract_id, amount, currency, offer_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(idempotency_key) DO NOTHING`,
    )
    .run(
      randomUUID(),
      key,
      notice.eventType,
      notice.contractId,
      notice.amount,
      notice.currency,
      notice.offerId,
      notice.status.slice(0, 32),
      now,
    );
  if (inserted.changes === 0) {
    return "duplicate";
  }

  const checkout = findCheckoutByNotice(database, notice);
  if (!checkout) {
    return "applied";
  }

  const offer = getOffer(database, checkout.offer_code);
  if (!offer) {
    return "applied";
  }

  if (notice.eventType === "payment.success" || notice.eventType === "subscription.recurring.payment.success") {
    database
      .prepare("UPDATE billing_checkouts SET status = 'paid' WHERE id = ?")
      .run(checkout.id);
    database
      .prepare("UPDATE gift_grants SET status = 'ready' WHERE checkout_id = ? AND status = 'pending'")
      .run(checkout.id);
    applyPaidOffer(database, checkout.user_id, offer, notice.contractId);
    return "applied";
  }

  if (notice.eventType === "payment.failed" || notice.eventType === "subscription.recurring.payment.failed") {
    const nextStatus = notice.eventType === "subscription.recurring.payment.failed" ? "past_due" : "failed";
    database.prepare("UPDATE billing_checkouts SET status = ? WHERE id = ?").run(nextStatus, checkout.id);
    if (nextStatus === "past_due") {
      database
        .prepare(
          `UPDATE billing_entitlements SET status = 'past_due', updated_at = ?
           WHERE user_id = ? AND contract_id = ?`,
        )
        .run(now, checkout.user_id, notice.contractId);
    }
    return "applied";
  }

  if (notice.eventType === "subscription.cancelled") {
    database
      .prepare(
        `UPDATE billing_entitlements
         SET status = 'canceled', period_end = COALESCE(?, period_end), updated_at = ?
         WHERE user_id = ? AND contract_id = ?`,
      )
      .run(notice.willExpireAt, now, checkout.user_id, notice.contractId);
    return "applied";
  }

  if (notice.eventType === "refund.success" || notice.eventType === "chargeback.initiated") {
    database.prepare("UPDATE billing_checkouts SET status = 'refunded' WHERE id = ?").run(checkout.id);
    database
      .prepare(
        `UPDATE gift_grants SET status = 'revoked', code_once = NULL
         WHERE checkout_id = ? AND redeemer_user_id IS NULL`,
      )
      .run(checkout.id);
    database
      .prepare(
        `UPDATE billing_entitlements
         SET status = 'canceled', period_end = ?, updated_at = ?
         WHERE user_id = ? AND contract_id = ?`,
      )
      .run(now, now, checkout.user_id, notice.contractId);
    return "applied";
  }

  return "applied";
}

export function redeemGift(
  database: Database.Database,
  userId: string,
  code: string,
): { ok: true } | { ok: false; error: string } {
  const row = database
    .prepare(
      `SELECT id, offer_code, status, redeemer_user_id FROM gift_grants WHERE code_hash = ?`,
    )
    .get(hashSecret(code.trim())) as {
    id: string;
    offer_code: string;
    status: string;
    redeemer_user_id: string | null;
  } | undefined;

  if (!row || row.status !== "ready" || row.redeemer_user_id) {
    return { ok: false, error: "Код недействителен" };
  }

  const offer = getOffer(database, row.offer_code);
  if (!offer) {
    return { ok: false, error: "Код недействителен" };
  }

  const now = new Date();
  const periodEnd = offer.duration_days > 0 ? addDays(now, offer.duration_days) : null;
  database
    .prepare(
      `UPDATE gift_grants
       SET redeemer_user_id = ?, status = 'redeemed', redeemed_at = ?, code_once = NULL
       WHERE id = ?`,
    )
    .run(userId, now.toISOString(), row.id);

  if (offer.package_name === "tokens") {
    addPurchasedTokens(database, userId, offer.tokens, null, "gift");
    return { ok: true };
  }

  if (offer.package_name === "cloud" || offer.package_name === "ai" || offer.package_name === "team") {
    upsertEntitlement(database, {
      userId,
      packageName: offer.package_name,
      status: "gifted",
      periodEnd,
      contractId: null,
      offerCode: offer.code,
      source: `gift:${row.id}`,
    });
  }
  if (offer.package_name === "team") {
    ensureOrganization(database, userId, offer.seats);
  }
  if (offer.tokens > 0 && offer.package_name !== "tokens" && periodEnd) {
    grantIncludedTokens(database, userId, offer.tokens, periodEnd, null);
  }
  return { ok: true };
}

export function createInvite(
  database: Database.Database,
  ownerUserId: string,
): { code: string; expiresAt: string } | null {
  if (!hasActivePackage(database, ownerUserId, "team") && !hasActivePackage(database, ownerUserId, "enterprise")) {
    return null;
  }
  const org = database
    .prepare("SELECT id, seat_limit FROM organizations WHERE owner_user_id = ?")
    .get(ownerUserId) as { id: string; seat_limit: number } | undefined;
  if (!org) {
    return null;
  }
  const code = generateSecretCode();
  const expiresAt = addDays(new Date(), 7);
  database
    .prepare(
      `INSERT INTO organization_invites (id, organization_id, code_hash, code_once, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), org.id, hashSecret(code), code, expiresAt, new Date().toISOString());
  return { code, expiresAt };
}

export function acceptInvite(
  database: Database.Database,
  userId: string,
  code: string,
): { ok: true } | { ok: false; error: string } {
  const invite = database
    .prepare(
      `SELECT id, organization_id, expires_at FROM organization_invites WHERE code_hash = ?`,
    )
    .get(hashSecret(code.trim())) as {
    id: string;
    organization_id: string;
    expires_at: string;
  } | undefined;
  if (!invite || new Date(invite.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "Ссылка недействительна" };
  }
  const org = database
    .prepare("SELECT seat_limit FROM organizations WHERE id = ?")
    .get(invite.organization_id) as { seat_limit: number } | undefined;
  if (!org) {
    return { ok: false, error: "Ссылка недействительна" };
  }
  const occupied = database
    .prepare("SELECT COUNT(*) AS count FROM organization_members WHERE organization_id = ?")
    .get(invite.organization_id) as { count: number };
  const already = database
    .prepare(
      `SELECT 1 AS ok FROM organization_members WHERE organization_id = ? AND user_id = ?`,
    )
    .get(invite.organization_id, userId);
  if (!already && occupied.count >= org.seat_limit) {
    return { ok: false, error: "Свободных мест нет" };
  }
  database
    .prepare(
      `INSERT INTO organization_members (organization_id, user_id, role, created_at)
       VALUES (?, ?, 'member', ?)
       ON CONFLICT(organization_id, user_id) DO NOTHING`,
    )
    .run(invite.organization_id, userId, new Date().toISOString());
  database.prepare("DELETE FROM organization_invites WHERE id = ?").run(invite.id);
  return { ok: true };
}

export function takeInviteCode(
  database: Database.Database,
  ownerUserId: string,
  inviteId: string,
): string | null {
  const row = database
    .prepare(
      `SELECT invites.code_once AS code_once, invites.id AS id
       FROM organization_invites invites
       INNER JOIN organizations orgs ON orgs.id = invites.organization_id
       WHERE invites.id = ? AND orgs.owner_user_id = ?`,
    )
    .get(inviteId, ownerUserId) as { code_once: string | null; id: string } | undefined;
  if (!row?.code_once) {
    return null;
  }
  database.prepare("UPDATE organization_invites SET code_once = NULL WHERE id = ?").run(row.id);
  return row.code_once;
}

export function recordAudit(
  database: Database.Database,
  adminUserId: string,
  action: string,
  entityId: string,
): void {
  database
    .prepare(
      `INSERT INTO billing_audit (id, admin_user_id, action, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), adminUserId, action, entityId, new Date().toISOString());
}

export function isKnownManualReason(value: string): value is BillingManualReason {
  return (BILLING_MANUAL_REASONS as readonly string[]).includes(value);
}

export function manualGrant(
  database: Database.Database,
  adminUserId: string,
  userId: string,
  packageName: BillingPackage,
  durationDays: number,
  reason: BillingManualReason,
): void {
  const periodEnd = durationDays > 0 ? addDays(new Date(), durationDays) : null;
  upsertEntitlement(database, {
    userId,
    packageName,
    status: packageName === "enterprise" ? "active" : "active",
    periodEnd,
    contractId: null,
    offerCode: null,
    source: `manual:${reason}`,
  });
  recordAudit(database, adminUserId, reason, userId);
}

export function adjustTokens(
  database: Database.Database,
  adminUserId: string,
  userId: string,
  bucket: "included" | "purchased",
  amount: number,
  reason: BillingManualReason,
): void {
  ensureAccount(database, userId);
  const column = bucket === "included" ? "included_balance" : "purchased_balance";
  database
    .prepare(
      `UPDATE billing_accounts SET ${column} = MAX(0, ${column} + ?), updated_at = ? WHERE user_id = ?`,
    )
    .run(amount, new Date().toISOString(), userId);
  database
    .prepare(
      `INSERT INTO token_ledger (
        id, user_id, organization_id, bucket, amount, entry_type, request_id, contract_id, created_at
      ) VALUES (?, ?, NULL, ?, ?, 'adjustment', NULL, NULL, ?)`,
    )
    .run(randomUUID(), userId, bucket, amount, new Date().toISOString());
  recordAudit(database, adminUserId, reason, userId);
}

export function createEnterpriseRequest(
  database: Database.Database,
  userId: string,
  seats: number,
  flags: string[],
): string {
  const id = randomUUID();
  database
    .prepare(
      `INSERT INTO enterprise_requests (id, user_id, seats, flags, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, userId, seats, JSON.stringify(flags), new Date().toISOString());
  return id;
}

export function billingStats(database: Database.Database, sinceIso: string): {
  activeByPackage: Record<string, number>;
  events: Record<string, number>;
  tokensGranted: number;
  tokensDebited: number;
  giftsReady: number;
  giftsRedeemed: number;
  campaignGrants: number;
} {
  const activeRows = database
    .prepare(
      `SELECT package_name, COUNT(*) AS count
       FROM billing_entitlements
       WHERE status IN ('trialing', 'active', 'past_due', 'gifted')
         AND (period_end IS NULL OR period_end > ?)
       GROUP BY package_name`,
    )
    .all(new Date().toISOString()) as Array<{ package_name: string; count: number }>;
  const activeByPackage: Record<string, number> = {};
  for (const row of activeRows) {
    activeByPackage[row.package_name] = row.count;
  }

  const eventRows = database
    .prepare(
      `SELECT event_type, COUNT(*) AS count FROM lava_events WHERE created_at >= ? GROUP BY event_type`,
    )
    .all(sinceIso) as Array<{ event_type: string; count: number }>;
  const events: Record<string, number> = {};
  for (const row of eventRows) {
    events[row.event_type] = row.count;
  }

  const granted = database
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM token_ledger
       WHERE created_at >= ? AND amount > 0`,
    )
    .get(sinceIso) as { total: number };
  const debited = database
    .prepare(
      `SELECT COALESCE(SUM(-amount), 0) AS total FROM token_ledger
       WHERE created_at >= ? AND entry_type = 'debit'`,
    )
    .get(sinceIso) as { total: number };
  const gifts = database
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready,
         SUM(CASE WHEN status = 'redeemed' THEN 1 ELSE 0 END) AS redeemed
       FROM gift_grants WHERE created_at >= ?`,
    )
    .get(sinceIso) as { ready: number | null; redeemed: number | null };
  const campaigns = database
    .prepare(
      `SELECT COUNT(*) AS count FROM billing_campaign_grants WHERE created_at >= ?`,
    )
    .get(sinceIso) as { count: number };

  return {
    activeByPackage,
    events,
    tokensGranted: granted.total,
    tokensDebited: debited.total,
    giftsReady: gifts.ready ?? 0,
    giftsRedeemed: gifts.redeemed ?? 0,
    campaignGrants: campaigns.count,
  };
}

export type { BillingOfferCode };
