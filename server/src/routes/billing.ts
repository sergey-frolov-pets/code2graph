import { Hono } from "hono";
import type { AuthVariables } from "../auth/context.js";
import { requireAuthenticatedUser } from "../auth.js";
import { BILLING_PUBLIC_BASE_URL } from "../config.js";
import { getDb } from "../db.js";
import { isBillingOfferCode as isOfferCode } from "../billing/constants.js";
import { createLavaInvoice } from "../billing/lava-client.js";
import { cloudLimits } from "../billing/limits.js";
import {
  acceptInvite,
  attachInvoiceId,
  createCheckout,
  createEnterpriseRequest,
  createInvite,
  getOffer,
  hasActivePackage,
  listOffers,
  readBalances,
  readCheckoutForBuyer,
  redeemGift,
  userHasTeamSeat,
} from "../billing/service.js";

export const billingRouter = new Hono<{ Variables: AuthVariables }>();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_FLAG_COUNT = 12;
const MAX_FLAG_LENGTH = 40;

function checkoutEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return null;
  }
  return email;
}

billingRouter.get("/me", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  const database = getDb();
  const limits = cloudLimits(database, user.id);
  const balances = readBalances(database, user.id);
  return context.json({
    packages: {
      cloud: hasActivePackage(database, user.id, "cloud") || userHasTeamSeat(database, user.id),
      ai: hasActivePackage(database, user.id, "ai"),
      team: hasActivePackage(database, user.id, "team") || userHasTeamSeat(database, user.id),
      enterprise: hasActivePackage(database, user.id, "enterprise"),
    },
    limits,
    tokens: balances,
  });
});

billingRouter.get("/offers", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  const offers = listOffers(getDb()).map((offer) => ({
    code: offer.code,
    packageName: offer.package_name,
    kind: offer.kind,
    period: offer.period,
    tokens: offer.tokens,
    seats: offer.seats,
    durationDays: offer.duration_days,
    configured: Boolean(offer.offer_id),
  }));
  return context.json({ offers });
});

billingRouter.post("/checkout", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return context.json({ error: "Некорректный запрос" }, 400);
  }
  const record = body as Record<string, unknown>;
  const offerCode = typeof record.offerCode === "string" ? record.offerCode : "";
  const email = checkoutEmail(record.email);
  if (!isOfferCode(offerCode) || !email) {
    return context.json({ error: "Укажите пакет и email для оплаты" }, 400);
  }

  const database = getDb();
  const offer = getOffer(database, offerCode);
  if (!offer?.offer_id) {
    return context.json({ error: "Пакет ещё не подключён к оплате" }, 503);
  }

  let amount: number | undefined;
  let currency: string | undefined;
  if (offer.kind === "enterprise") {
    if (typeof record.amount !== "number" || record.amount <= 0) {
      return context.json({ error: "Укажите сумму счёта" }, 400);
    }
    amount = record.amount;
    currency = typeof record.currency === "string" ? record.currency : "RUB";
  }

  const checkout = createCheckout(database, user.id, offerCode, null);
  const base = BILLING_PUBLIC_BASE_URL.replace(/\/$/, "");
  try {
    const invoice = await createLavaInvoice({
      email,
      offerId: offer.offer_id,
      amount,
      currency,
      successUrl: `${base}/?billingCheckout=${checkout.id}`,
      failureUrl: `${base}/?billingCheckout=${checkout.id}&billingStatus=failed`,
    });
    attachInvoiceId(database, checkout.id, invoice.invoiceId);
    return context.json({ checkoutId: checkout.id, paymentUrl: invoice.paymentUrl });
  } catch {
    database.prepare("UPDATE billing_checkouts SET status = 'failed' WHERE id = ?").run(checkout.id);
    return context.json({ error: "Не удалось создать счёт" }, 502);
  }
});

billingRouter.get("/checkouts/:id", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  const checkout = readCheckoutForBuyer(getDb(), context.req.param("id"), user.id);
  if (!checkout) {
    return context.json({ error: "Счёт не найден" }, 404);
  }
  return context.json(checkout);
});

billingRouter.post("/gifts/redeem", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  const body = await context.req.json().catch(() => null);
  const code = body && typeof body === "object" && "code" in body && typeof body.code === "string"
    ? body.code
    : "";
  const result = redeemGift(getDb(), user.id, code);
  if (!result.ok) {
    return context.json({ error: result.error }, 400);
  }
  return context.json({ ok: true });
});

billingRouter.post("/team/invites", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  const invite = createInvite(getDb(), user.id);
  if (!invite) {
    return context.json({ error: "Командный пакет не активен" }, 403);
  }
  return context.json(invite);
});

billingRouter.post("/team/invites/accept", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  const body = await context.req.json().catch(() => null);
  const code = body && typeof body === "object" && "code" in body && typeof body.code === "string"
    ? body.code
    : "";
  const result = acceptInvite(getDb(), user.id, code);
  if (!result.ok) {
    return context.json({ error: result.error }, 400);
  }
  return context.json({ ok: true });
});

billingRouter.post("/enterprise-request", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return context.json({ error: "Некорректный запрос" }, 400);
  }
  const record = body as Record<string, unknown>;
  const seats = typeof record.seats === "number" ? Math.round(record.seats) : 0;
  const flags = Array.isArray(record.flags)
    ? record.flags.filter((flag): flag is string => typeof flag === "string" && flag.length <= MAX_FLAG_LENGTH).slice(0, MAX_FLAG_COUNT)
    : [];
  if (seats < 1) {
    return context.json({ error: "Укажите число мест" }, 400);
  }
  const id = createEnterpriseRequest(getDb(), user.id, seats, flags);
  return context.json({
    id,
    mailto: "mailto:admin@code2graph.ru",
  });
});
