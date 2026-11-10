import {
  LAVA_EVENT_TYPES,
  type LavaEventType,
} from "./constants.js";

export interface LavaNotice {
  eventType: LavaEventType;
  contractId: string;
  invoiceId: string | null;
  amount: number | null;
  currency: string | null;
  offerId: string | null;
  status: string;
  willExpireAt: string | null;
  paidAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readAmount(source: Record<string, unknown>): number | null {
  const value = source.amount ?? source.amount_total;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Math.round(Number(value));
  }
  return null;
}

function isLavaEventType(value: string): value is LavaEventType {
  return (LAVA_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Keeps payment identifiers only. Buyer objects, emails and the raw body are dropped.
 */
export function readLavaNotice(body: unknown): LavaNotice | null {
  if (!isRecord(body)) {
    return null;
  }

  const payload = isRecord(body.data) ? body.data : body;
  const eventType = readString(body, ["eventType", "event_type"]) ?? readString(payload, ["eventType", "event_type"]);
  if (!eventType || !isLavaEventType(eventType)) {
    return null;
  }

  const contractId = readString(payload, ["contractId", "contract_id", "invoiceId", "invoice_id", "id"]);
  if (!contractId) {
    return null;
  }

  const currency = readString(payload, ["currency"]);

  return {
    eventType,
    contractId,
    invoiceId: readString(payload, ["invoiceId", "invoice_id", "parentInvoiceId", "parent_invoice_id"]),
    amount: readAmount(payload),
    currency: currency ? currency.slice(0, 8) : null,
    offerId: readString(payload, ["offerId", "offer_id", "productId", "product_id"]),
    status: readString(payload, ["status"]) ?? eventType,
    willExpireAt: readString(payload, ["willExpireAt", "will_expire_at"]),
    paidAt: readString(payload, ["paidAt", "paid_at", "createdAt", "created_at"]),
  };
}

export function lavaNoticeKey(notice: LavaNotice): string {
  return [
    notice.eventType,
    notice.contractId,
    notice.paidAt ?? "",
    notice.amount ?? "",
    notice.status,
  ].join(":");
}
