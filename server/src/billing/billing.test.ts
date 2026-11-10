import { describe, expect, it } from "vitest";
import { applyBillingSchema } from "./schema.js";
import { readLavaNotice } from "./lava-notice.js";
import {
  addPurchasedTokens,
  applyLavaNotice,
  applyNewAccountCampaigns,
  attachInvoiceId,
  createCheckout,
  debitTokens,
  grantIncludedTokens,
  readBalances,
  readCheckoutForBuyer,
  redeemGift,
  userHasCloudAccess,
} from "./service.js";
import { shareQuotaError } from "./limits.js";
import { createMemoryDatabase, seedTestUser } from "../test/memory-database.js";

describe("billing", () => {
  it("drops buyer details from a lava notice", () => {
    const notice = readLavaNotice({
      eventType: "payment.success",
      contractId: "contract-1",
      amount: 490,
      currency: "RUB",
      buyer: { email: "buyer@example.com" },
      email: "buyer@example.com",
    });

    expect(notice).toMatchObject({
      eventType: "payment.success",
      contractId: "contract-1",
      amount: 490,
      currency: "RUB",
    });
    expect(JSON.stringify(notice)).not.toContain("buyer@example.com");
  });

  it("grants cloud once and ignores a repeated payment", () => {
    const database = createMemoryDatabase();
    applyBillingSchema(database);
    const userId = "user-paid";
    seedTestUser(database, userId, "paid-user");
    const checkout = createCheckout(database, userId, "cloud_month", null);
    attachInvoiceId(database, checkout.id, "invoice-1");

    const body = {
      eventType: "payment.success",
      contractId: "invoice-1",
      amount: 100,
      currency: "RUB",
      buyer: { email: "hidden@example.com" },
    };

    expect(applyLavaNotice(database, body)).toBe("applied");
    expect(applyLavaNotice(database, body)).toBe("duplicate");
    expect(userHasCloudAccess(database, userId)).toBe(true);

    const stored = database
      .prepare("SELECT * FROM lava_events")
      .all() as Array<Record<string, unknown>>;
    expect(JSON.stringify(stored)).not.toContain("hidden@example.com");
  });

  it("spends included tokens before purchased ones", () => {
    const database = createMemoryDatabase();
    applyBillingSchema(database);
    const userId = "user-tokens";
    seedTestUser(database, userId, "token-user");
    grantIncludedTokens(database, userId, 1, "2099-01-01T00:00:00.000Z", null);
    addPurchasedTokens(database, userId, 5, null, "purchase");

    expect(debitTokens(database, userId, 1, "request-1")).toBe(true);
    expect(debitTokens(database, userId, 1, "request-1")).toBe(true);
    const balances = readBalances(database, userId);
    expect(balances).toEqual({ included: 0, purchased: 5 });
  });

  it("shows a gift code once and redeems it without storing a recipient email", () => {
    const database = createMemoryDatabase();
    applyBillingSchema(database);
    const buyerId = "user-giver";
    const recipientId = "user-taker";
    seedTestUser(database, buyerId, "giver");
    seedTestUser(database, recipientId, "taker");
    const checkout = createCheckout(database, buyerId, "gift_cloud_month", null);
    attachInvoiceId(database, checkout.id, "gift-invoice");
    applyLavaNotice(database, {
      eventType: "payment.success",
      contractId: "gift-invoice",
      amount: 100,
      currency: "RUB",
    });

    const firstRead = readCheckoutForBuyer(database, checkout.id, buyerId);
    const secondRead = readCheckoutForBuyer(database, checkout.id, buyerId);
    expect(firstRead?.code).toBeTruthy();
    expect(secondRead?.code).toBeNull();
    expect(redeemGift(database, recipientId, firstRead?.code ?? "")).toEqual({ ok: true });
    expect(userHasCloudAccess(database, recipientId)).toBe(true);

    const columns = database.prepare("PRAGMA table_info(gift_grants)").all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).not.toContain("email");
  });

  it("opens the welcome campaign for a new account", () => {
    const database = createMemoryDatabase();
    applyBillingSchema(database);
    const userId = "user-new";
    seedTestUser(database, userId, "new-account");
    applyNewAccountCampaigns(database, userId);
    expect(userHasCloudAccess(database, userId)).toBe(true);
    expect(readBalances(database, userId).included).toBe(50);
  });

  it("rejects a permanent share link on the free tier", () => {
    const database = createMemoryDatabase();
    applyBillingSchema(database);
    const userId = "user-free";
    seedTestUser(database, userId, "free-share");
    expect(
      shareQuotaError(database, userId, { expiresAt: null, permission: "view" }),
    ).toBeTruthy();
  });
});
