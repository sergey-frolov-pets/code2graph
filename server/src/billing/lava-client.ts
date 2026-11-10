import { LAVA_API_KEY } from "../config.js";

const LAVA_API_BASE = "https://gate.lava.top";

export interface LavaInvoiceResult {
  invoiceId: string;
  paymentUrl: string | null;
}

function readId(payload: Record<string, unknown>): string | null {
  for (const key of ["id", "invoiceId", "contractId"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readPaymentUrl(payload: Record<string, unknown>): string | null {
  for (const key of ["paymentUrl", "payment_url", "url"]) {
    const value = payload[key];
    if (typeof value === "string" && value.startsWith("https://")) {
      return value;
    }
  }
  return null;
}

export async function createLavaInvoice(input: {
  email: string;
  offerId: string;
  amount?: number;
  currency?: string;
  successUrl?: string;
  failureUrl?: string;
}): Promise<LavaInvoiceResult> {
  if (!LAVA_API_KEY) {
    throw new Error("lava_not_configured");
  }

  const body: Record<string, unknown> = {
    email: input.email,
    offerId: input.offerId,
  };
  if (input.amount !== undefined) {
    body.amount = input.amount;
    body.currency = input.currency ?? "RUB";
  }
  if (input.successUrl) {
    body.successful_return_url = input.successUrl;
  }
  if (input.failureUrl) {
    body.failure_return_url = input.failureUrl;
  }

  const response = await fetch(`${LAVA_API_BASE}/api/v3/invoice`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Api-Key": LAVA_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("lava_invoice_failed");
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const invoiceId = readId(payload);
  if (!invoiceId) {
    throw new Error("lava_invoice_failed");
  }
  return { invoiceId, paymentUrl: readPaymentUrl(payload) };
}

export async function cancelLavaSubscription(input: {
  productId: string;
  email: string;
}): Promise<void> {
  if (!LAVA_API_KEY) {
    throw new Error("lava_not_configured");
  }
  const url = new URL(`${LAVA_API_BASE}/api/v1/subscriptions`);
  url.searchParams.set("productId", input.productId);
  url.searchParams.set("email", input.email);
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "X-Api-Key": LAVA_API_KEY, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("lava_cancel_failed");
  }
}
