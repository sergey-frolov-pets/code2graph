import type { LibraryUserDto } from "@/constants/diagram-library";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import {
  buildRequestHeaders,
  requestJson,
  requestJsonPublic,
} from "./client";

export async function fetchLibraryAuthStatus(
  baseUrl?: string,
): Promise<{ needsSetup: boolean; registrationEnabled?: boolean }> {
  return requestJsonPublic("/auth/status", undefined, baseUrl);
}

export async function checkApiHealth(baseUrl?: string): Promise<boolean> {
  const resolved = baseUrl ?? getLibraryApiBaseUrl();
  if (!resolved) {
    return false;
  }

  try {
    await fetchLibraryAuthStatus(resolved);
    return true;
  } catch {
    try {
      const response = await fetch(`${resolved}/health`, {
        headers: buildRequestHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export async function registerLibraryAccount(
  username: string,
  password: string,
  baseUrl?: string,
): Promise<{ token: string; user: LibraryUserDto }> {
  return requestJsonPublic(
    "/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    baseUrl,
  );
}

export async function setupLibraryAdmin(
  username: string,
  password: string,
  baseUrl?: string,
): Promise<{ token: string; user: LibraryUserDto }> {
  return requestJsonPublic(
    "/auth/setup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    baseUrl,
  );
}

export async function loginLibrary(
  username: string,
  password: string,
  baseUrl?: string,
): Promise<{ token: string; user: LibraryUserDto }> {
  return requestJson(
    "/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    baseUrl,
  );
}

export async function fetchLibraryMe(
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson("/auth/me", undefined, baseUrl);
}
