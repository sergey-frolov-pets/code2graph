import type Database from "better-sqlite3";
import {
  BILLING_OFFER_DEFINITIONS,
  BILLING_PROMO_DAYS,
  BILLING_PROMO_TOKENS,
  BILLING_WELCOME_CAMPAIGN_ID,
} from "./constants.js";

export function applyBillingSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS billing_accounts (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      included_balance INTEGER NOT NULL DEFAULT 0,
      purchased_balance INTEGER NOT NULL DEFAULT 0,
      included_until TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS billing_offers (
      code TEXT PRIMARY KEY,
      package_name TEXT NOT NULL,
      kind TEXT NOT NULL,
      period TEXT NOT NULL,
      tokens INTEGER NOT NULL DEFAULT 0,
      seats INTEGER NOT NULL DEFAULT 0,
      duration_days INTEGER NOT NULL DEFAULT 0,
      offer_id TEXT
    );

    CREATE TABLE IF NOT EXISTS billing_entitlements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_name TEXT NOT NULL,
      status TEXT NOT NULL,
      period_end TEXT,
      contract_id TEXT,
      offer_code TEXT,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_billing_entitlements_user
      ON billing_entitlements(user_id, package_name);

    CREATE TABLE IF NOT EXISTS billing_checkouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      offer_code TEXT NOT NULL,
      lava_invoice_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_billing_checkouts_invoice
      ON billing_checkouts(lava_invoice_id);

    CREATE TABLE IF NOT EXISTS token_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT,
      bucket TEXT NOT NULL,
      amount INTEGER NOT NULL,
      entry_type TEXT NOT NULL,
      request_id TEXT,
      contract_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_token_ledger_request
      ON token_ledger(request_id) WHERE request_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS gift_grants (
      id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      code_once TEXT,
      checkout_id TEXT,
      purchaser_user_id TEXT REFERENCES users(id),
      redeemer_user_id TEXT REFERENCES users(id),
      offer_code TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      redeemed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      seat_limit INTEGER NOT NULL,
      included_balance INTEGER NOT NULL DEFAULT 0,
      purchased_balance INTEGER NOT NULL DEFAULT 0,
      included_until TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS organization_invites (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL UNIQUE,
      code_once TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lava_events (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      contract_id TEXT NOT NULL,
      amount INTEGER,
      currency TEXT,
      offer_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS billing_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      audience TEXT NOT NULL,
      package_name TEXT,
      duration_days INTEGER NOT NULL DEFAULT 0,
      tokens INTEGER NOT NULL DEFAULT 0,
      once_per_account INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS billing_campaign_grants (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES billing_campaigns(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(campaign_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS billing_audit (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enterprise_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seats INTEGER NOT NULL,
      flags TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedOffers(database);
  seedWelcomeCampaign(database);
}

function seedOffers(database: Database.Database): void {
  const insert = database.prepare(
    `INSERT INTO billing_offers (
      code, package_name, kind, period, tokens, seats, duration_days, offer_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      package_name = excluded.package_name,
      kind = excluded.kind,
      period = excluded.period,
      tokens = excluded.tokens,
      seats = excluded.seats,
      duration_days = excluded.duration_days`,
  );

  const updateOfferId = database.prepare(
    `UPDATE billing_offers SET offer_id = ? WHERE code = ? AND ? <> ''`,
  );

  for (const offer of BILLING_OFFER_DEFINITIONS) {
    insert.run(
      offer.code,
      offer.packageName,
      offer.kind,
      offer.period,
      offer.tokens,
      offer.seats,
      offer.durationDays,
      null,
    );
    const configured = process.env[offer.envKey]?.trim() ?? "";
    if (configured) {
      updateOfferId.run(configured, offer.code, configured);
    }
  }
}

function seedWelcomeCampaign(database: Database.Database): void {
  database
    .prepare(
      `INSERT INTO billing_campaigns (
        id, title, starts_at, ends_at, audience, package_name, duration_days,
        tokens, once_per_account, status
      ) VALUES (?, ?, ?, NULL, 'new_accounts', 'cloud', ?, ?, 1, 'running')
      ON CONFLICT(id) DO NOTHING`,
    )
    .run(
      BILLING_WELCOME_CAMPAIGN_ID,
      "Промо Cloud",
      "2026-01-01T00:00:00.000Z",
      BILLING_PROMO_DAYS,
      BILLING_PROMO_TOKENS,
    );
}
