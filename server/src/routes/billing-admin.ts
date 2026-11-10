import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { AuthVariables } from "../auth/context.js";
import { requireAuthenticatedUser } from "../auth.js";
import { isAdmin } from "../authz.js";
import { getDb, getUsernameMap } from "../db.js";
import { isBillingManualReason, type BillingPackage } from "../billing/constants.js";
import { cancelLavaSubscription } from "../billing/lava-client.js";
import {
  adjustTokens,
  billingStats,
  getOffer,
  manualGrant,
  recordAudit,
} from "../billing/service.js";

export const billingAdminRouter = new Hono<{ Variables: AuthVariables }>();

const PACKAGES = new Set(["cloud", "ai", "team", "enterprise"]);
const STATS_PERIODS_DAYS = [7, 30, 90] as const;

billingAdminRouter.use("*", async (context, next) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  if (!isAdmin(user)) {
    return context.json({ error: "forbidden" }, 403);
  }
  await next();
});

billingAdminRouter.get("/subscriptions", (context) => {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT id, user_id, package_name, status, period_end, contract_id, offer_code, source
       FROM billing_entitlements
       ORDER BY updated_at DESC
       LIMIT 200`,
    )
    .all() as Array<{
    id: string;
    user_id: string;
    package_name: string;
    status: string;
    period_end: string | null;
    contract_id: string | null;
    offer_code: string | null;
    source: string;
  }>;
  const names = getUsernameMap(database, rows.map((row) => row.user_id));
  return context.json({
    subscriptions: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: names.get(row.user_id) ?? "",
      packageName: row.package_name,
      status: row.status,
      periodEnd: row.period_end,
      contractId: row.contract_id,
      offerCode: row.offer_code,
      source: row.source,
    })),
  });
});

billingAdminRouter.post("/grants", async (context) => {
  const admin = requireAuthenticatedUser(context);
  if (admin instanceof Response) {
    return admin;
  }
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return context.json({ error: "Некорректный запрос" }, 400);
  }
  const record = body as Record<string, unknown>;
  const userId = typeof record.userId === "string" ? record.userId : "";
  const packageName = typeof record.packageName === "string" ? record.packageName : "";
  const durationDays = typeof record.durationDays === "number" ? Math.round(record.durationDays) : 0;
  const reason = typeof record.reason === "string" ? record.reason : "";
  if (!userId || !PACKAGES.has(packageName) || !isBillingManualReason(reason)) {
    return context.json({ error: "Некорректные поля" }, 400);
  }
  manualGrant(getDb(), admin.id, userId, packageName as BillingPackage, durationDays, reason);
  return context.json({ ok: true });
});

billingAdminRouter.post("/tokens", async (context) => {
  const admin = requireAuthenticatedUser(context);
  if (admin instanceof Response) {
    return admin;
  }
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return context.json({ error: "Некорректный запрос" }, 400);
  }
  const record = body as Record<string, unknown>;
  const userId = typeof record.userId === "string" ? record.userId : "";
  const bucket = record.bucket === "purchased" ? "purchased" : record.bucket === "included" ? "included" : "";
  const amount = typeof record.amount === "number" ? Math.round(record.amount) : 0;
  const reason = typeof record.reason === "string" ? record.reason : "";
  if (!userId || !bucket || amount === 0 || !isBillingManualReason(reason)) {
    return context.json({ error: "Некорректные поля" }, 400);
  }
  adjustTokens(getDb(), admin.id, userId, bucket, amount, reason);
  return context.json({ ok: true });
});

billingAdminRouter.post("/cancel", async (context) => {
  const admin = requireAuthenticatedUser(context);
  if (admin instanceof Response) {
    return admin;
  }
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return context.json({ error: "Некорректный запрос" }, 400);
  }
  const record = body as Record<string, unknown>;
  const entitlementId = typeof record.entitlementId === "string" ? record.entitlementId : "";
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const database = getDb();
  const row = database
    .prepare(
      `SELECT id, user_id, offer_code, contract_id FROM billing_entitlements WHERE id = ?`,
    )
    .get(entitlementId) as {
    id: string;
    user_id: string;
    offer_code: string | null;
    contract_id: string | null;
  } | undefined;
  if (!row) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }
  database
    .prepare(
      `UPDATE billing_entitlements SET status = 'canceled', updated_at = ? WHERE id = ?`,
    )
    .run(new Date().toISOString(), row.id);
  recordAudit(database, admin.id, "support_revoke", row.id);

  if (email && row.offer_code) {
    const offer = getOffer(database, row.offer_code);
    if (offer?.offer_id) {
      try {
        await cancelLavaSubscription({ productId: offer.offer_id, email });
      } catch {
        return context.json({ ok: true, lava: "failed" });
      }
      return context.json({ ok: true, lava: "cancelled" });
    }
  }
  return context.json({ ok: true, lava: "skipped" });
});

billingAdminRouter.get("/campaigns", (context) => {
  const rows = getDb()
    .prepare(
      `SELECT id, title, starts_at, ends_at, audience, package_name, duration_days, tokens, status
       FROM billing_campaigns ORDER BY starts_at DESC`,
    )
    .all();
  return context.json({ campaigns: rows });
});

billingAdminRouter.post("/campaigns", async (context) => {
  const admin = requireAuthenticatedUser(context);
  if (admin instanceof Response) {
    return admin;
  }
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return context.json({ error: "Некорректный запрос" }, 400);
  }
  const record = body as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim().slice(0, 80) : "";
  const audience = record.audience === "selected_users" ? "selected_users" : "new_accounts";
  const packageName = record.packageName === "cloud" ? "cloud" : null;
  const durationDays = typeof record.durationDays === "number" ? Math.max(0, Math.round(record.durationDays)) : 0;
  const tokens = typeof record.tokens === "number" ? Math.max(0, Math.round(record.tokens)) : 0;
  if (!title) {
    return context.json({ error: "Укажите название" }, 400);
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO billing_campaigns (
        id, title, starts_at, ends_at, audience, package_name, duration_days, tokens, once_per_account, status
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 1, 'draft')`,
    )
    .run(id, title, now, audience, packageName, durationDays, tokens);
  recordAudit(getDb(), admin.id, "campaign_create", id);
  return context.json({ id }, 201);
});

billingAdminRouter.post("/campaigns/:id/launch", (context) => {
  const admin = requireAuthenticatedUser(context);
  if (admin instanceof Response) {
    return admin;
  }
  const id = context.req.param("id");
  const result = getDb()
    .prepare(`UPDATE billing_campaigns SET status = 'running' WHERE id = ? AND status = 'draft'`)
    .run(id);
  if (result.changes === 0) {
    return context.json({ error: "Кампания не найдена или уже запущена" }, 404);
  }
  recordAudit(getDb(), admin.id, "campaign_launch", id);
  return context.json({ ok: true });
});

billingAdminRouter.post("/campaigns/:id/pause", (context) => {
  const admin = requireAuthenticatedUser(context);
  if (admin instanceof Response) {
    return admin;
  }
  const id = context.req.param("id");
  getDb().prepare(`UPDATE billing_campaigns SET status = 'paused' WHERE id = ?`).run(id);
  recordAudit(getDb(), admin.id, "campaign_pause", id);
  return context.json({ ok: true });
});

billingAdminRouter.get("/stats", (context) => {
  const requested = Number(context.req.query("days") ?? "30");
  const days = (STATS_PERIODS_DAYS as readonly number[]).includes(requested) ? requested : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return context.json({ days, ...billingStats(getDb(), since) });
});
