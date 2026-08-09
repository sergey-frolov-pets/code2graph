import type {
  CreateSubscriptionPayload,
  DiagramDto,
  DiagramListItemDto,
  GrantedSubscriptionDto,
  SectionDto,
  SubscriptionDto,
  UpdateSubscriptionPayload,
  UserSubscriptionGrantDto,
} from "@/constants/diagram-library";
import {
  buildRequestHeaders,
  LibraryApiError,
  parseError,
  requestJson,
  resolveApiBaseUrl,
} from "./client";

export async function fetchSubscriptions(
  baseUrl?: string,
): Promise<{ subscriptions: SubscriptionDto[] }> {
  return requestJson("/subscriptions", undefined, baseUrl);
}

export async function fetchMySubscriptions(
  baseUrl?: string,
): Promise<{ subscriptions: GrantedSubscriptionDto[] }> {
  return requestJson("/subscriptions/mine", undefined, baseUrl);
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
    usernames?: string[];
    userId?: string;
    permanent?: boolean;
    expiresAt?: string | null;
  },
  baseUrl?: string,
): Promise<{ ok: boolean; grants: UserSubscriptionGrantDto[] }> {
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

function resolveSubscriptionAccessApiBaseUrl(baseUrl?: string): string {
  const apiBase = resolveApiBaseUrl(baseUrl);
  return `${apiBase.replace(/\/api$/, "")}/api/subscriptions/access`;
}

export async function fetchSubscriptionAccess(
  token: string,
  baseUrl?: string,
): Promise<{
  subscription: SubscriptionDto;
  primaryTarget: { type: "section" | "diagram"; id: string } | null;
  canDownload: boolean;
  readOnly: boolean;
}> {
  const accessBase = resolveSubscriptionAccessApiBaseUrl(baseUrl);
  const response = await fetch(`${accessBase}/${token}`, {
    headers: buildRequestHeaders(),
  });

  if (!response.ok) {
    throw new LibraryApiError(await parseError(response), response.status);
  }

  return (await response.json()) as {
    subscription: SubscriptionDto;
    primaryTarget: { type: "section" | "diagram"; id: string } | null;
    canDownload: boolean;
    readOnly: boolean;
  };
}

export async function fetchSubscriptionAccessDiagram(
  token: string,
  diagramId: string,
  baseUrl?: string,
): Promise<{
  subscription: SubscriptionDto;
  diagram: DiagramDto;
  watermarkedPreview: boolean;
  canDownload: boolean;
  readOnly: boolean;
}> {
  const accessBase = resolveSubscriptionAccessApiBaseUrl(baseUrl);
  const response = await fetch(`${accessBase}/${token}/diagrams/${diagramId}`, {
    headers: buildRequestHeaders(),
  });

  if (!response.ok) {
    throw new LibraryApiError(await parseError(response), response.status);
  }

  return (await response.json()) as {
    subscription: SubscriptionDto;
    diagram: DiagramDto;
    watermarkedPreview: boolean;
    canDownload: boolean;
    readOnly: boolean;
  };
}

export async function fetchSubscriptionAccessSectionDiagrams(
  token: string,
  sectionId: string,
  baseUrl?: string,
): Promise<{
  subscription: SubscriptionDto;
  sectionId: string;
  section: SectionDto;
  diagrams: DiagramListItemDto[];
  canDownload: boolean;
  readOnly: boolean;
}> {
  const accessBase = resolveSubscriptionAccessApiBaseUrl(baseUrl);
  const response = await fetch(
    `${accessBase}/${token}/sections/${sectionId}/diagrams`,
    {
      headers: buildRequestHeaders(),
    },
  );

  if (!response.ok) {
    throw new LibraryApiError(await parseError(response), response.status);
  }

  return (await response.json()) as {
    subscription: SubscriptionDto;
    sectionId: string;
    section: SectionDto;
    diagrams: DiagramListItemDto[];
    canDownload: boolean;
    readOnly: boolean;
  };
}

export function buildSubscriptionAccessUrl(urlPath: string): string {
  const base = new URL(window.location.href);
  base.search = "";
  base.hash = "";
  if (urlPath.startsWith("?")) {
    base.search = urlPath.slice(1);
  } else if (urlPath.startsWith("/")) {
    base.pathname = urlPath;
  } else {
    base.search = urlPath;
  }
  return base.toString();
}
