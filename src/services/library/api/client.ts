import { getLibraryApiBaseUrl } from "@/config/library-api";
import { buildLibraryAuthHeader } from "@/config/library-credentials";

export class LibraryApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LibraryApiError";
    this.status = status;
  }
}

/** @deprecated Use LibraryApiError */
export const DiagramApiError = LibraryApiError;

export function resolveApiBaseUrl(baseUrl?: string): string {
  const resolved = baseUrl ?? getLibraryApiBaseUrl();
  if (!resolved) {
    throw new LibraryApiError("Library server is not configured", 0);
  }

  return resolved;
}

export function buildRequestHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const authHeader = buildLibraryAuthHeader();

  for (const [name, value] of Object.entries(authHeader)) {
    headers.set(name, value);
  }

  return headers;
}

export async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) {
      return data.error;
    }
  } catch {
    // ignore
  }

  return `HTTP ${response.status}`;
}

export async function requestJsonPublic<T>(
  path: string,
  init?: RequestInit,
  baseUrl?: string,
): Promise<T> {
  const apiBaseUrl = resolveApiBaseUrl(baseUrl);
  const response = await fetch(`${apiBaseUrl}${path}`, init);

  if (!response.ok) {
    throw new LibraryApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
  baseUrl?: string,
): Promise<T> {
  const apiBaseUrl = resolveApiBaseUrl(baseUrl);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: buildRequestHeaders(init),
  });

  if (!response.ok) {
    throw new LibraryApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function resolveShareApiBaseUrl(baseUrl?: string): string {
  const apiBase = resolveApiBaseUrl(baseUrl);
  return apiBase.replace(/\/api$/, "") + "/api/share";
}
