import type { LibraryUserDto } from "@/constants/diagram-library";
import { requestJson } from "./client";

export async function fetchAdminUsers(
  baseUrl?: string,
): Promise<{ users: LibraryUserDto[] }> {
  return requestJson("/admin/users", undefined, baseUrl);
}

export async function setUserBlocked(
  userId: string,
  blocked: boolean,
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson(
    `/admin/users/${userId}/block`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked }),
    },
    baseUrl,
  );
}

export async function setUserSubscription(
  userId: string,
  subscriptionActive: boolean,
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson(
    `/admin/users/${userId}/subscription`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionActive }),
    },
    baseUrl,
  );
}

export async function createAdminUser(
  payload: {
    username: string;
    password: string;
    role?: LibraryUserDto["role"];
    subscriptionActive?: boolean;
  },
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson(
    "/admin/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function updateAdminUser(
  userId: string,
  payload: {
    username?: string;
    password?: string;
    role?: LibraryUserDto["role"];
    blocked?: boolean;
    subscriptionActive?: boolean;
  },
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson(
    `/admin/users/${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function deleteAdminUser(
  userId: string,
  baseUrl?: string,
): Promise<{ ok: boolean }> {
  return requestJson(`/admin/users/${userId}`, { method: "DELETE" }, baseUrl);
}
