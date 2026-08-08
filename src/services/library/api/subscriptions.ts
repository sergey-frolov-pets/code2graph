import type {
  CreateSubscriptionPayload,
  SubscriptionDto,
  UpdateSubscriptionPayload,
  UserSubscriptionGrantDto,
} from "@/constants/diagram-library";
import { requestJson } from "./client";

export async function fetchSubscriptions(
  baseUrl?: string,
): Promise<{ subscriptions: SubscriptionDto[] }> {
  return requestJson("/subscriptions", undefined, baseUrl);
}

export async function createSubscription(
  payload: CreateSubscriptionPayload,
  baseUrl?: string,
): Promise<{ subscription: SubscriptionDto }> {
  return requestJson(
    "/subscriptions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function updateSubscription(
  subscriptionId: string,
  payload: UpdateSubscriptionPayload,
  baseUrl?: string,
): Promise<{ subscription: SubscriptionDto }> {
  return requestJson(
    `/subscriptions/${subscriptionId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function deleteSubscription(
  subscriptionId: string,
  baseUrl?: string,
): Promise<{ ok: boolean }> {
  return requestJson(`/subscriptions/${subscriptionId}`, { method: "DELETE" }, baseUrl);
}

export async function fetchSubscriptionGrants(
  subscriptionId: string,
  baseUrl?: string,
): Promise<{ grants: UserSubscriptionGrantDto[] }> {
  return requestJson(`/subscriptions/${subscriptionId}/grants`, undefined, baseUrl);
}

export async function grantSubscription(
  subscriptionId: string,
  payload: {
    username?: string;
    userId?: string;
    permanent?: boolean;
    expiresAt?: string | null;
  },
  baseUrl?: string,
): Promise<{ ok: boolean }> {
  return requestJson(
    `/subscriptions/${subscriptionId}/grants`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function revokeSubscriptionGrant(
  subscriptionId: string,
  userId: string,
  baseUrl?: string,
): Promise<{ ok: boolean }> {
  return requestJson(
    `/subscriptions/${subscriptionId}/grants/${userId}`,
    { method: "DELETE" },
    baseUrl,
  );
}
