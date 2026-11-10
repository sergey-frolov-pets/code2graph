import { isLibraryServerConfigured } from "@/config/library-api";
import type { AiChatShareSnapshot } from "@/types/ai-chat-session";
import {
  LibraryApiError,
  buildRequestHeaders,
  parseError,
  resolveShareApiBaseUrl,
} from "./client";

export function isAiChatShareServerAvailable(): boolean {
  return isLibraryServerConfigured();
}

export function buildAiChatShareUrl(token: string): string {
  const url = new URL(window.location.href);
  url.search = `?share-chat=${encodeURIComponent(token)}`;
  url.hash = "#/share-chat";
  return url.toString();
}

export function readAiChatShareToken(search: string): string | null {
  const token = new URLSearchParams(search).get("share-chat")?.trim();
  return token ? token : null;
}

export async function createAiChatShareLink(
  snapshot: AiChatShareSnapshot,
): Promise<{ token: string; url: string }> {
  const shareBase = resolveShareApiBaseUrl();
  const response = await fetch(`${shareBase}/ai-chat`, {
    method: "POST",
    headers: buildRequestHeaders({
      headers: { "Content-Type": "application/json" },
    }),
    body: JSON.stringify({
      title: snapshot.title,
      diagramFormat: snapshot.diagramFormat,
      snapshot,
    }),
  });

  if (!response.ok) {
    throw new LibraryApiError(await parseError(response), response.status);
  }

  const data = (await response.json()) as { link: { token: string } };
  return { token: data.link.token, url: buildAiChatShareUrl(data.link.token) };
}

export async function fetchAiChatShare(
  token: string,
): Promise<AiChatShareSnapshot> {
  const shareBase = resolveShareApiBaseUrl();
  const response = await fetch(`${shareBase}/${encodeURIComponent(token)}`, {
    headers: buildRequestHeaders(),
  });

  if (!response.ok) {
    throw new LibraryApiError(await parseError(response), response.status);
  }

  const data = (await response.json()) as { chat?: AiChatShareSnapshot };
  if (!data.chat) {
    throw new LibraryApiError("AI chat snapshot not found", 404);
  }
  return data.chat;
}

export async function revokeAiChatShareLink(token: string): Promise<void> {
  const shareBase = resolveShareApiBaseUrl();
  const response = await fetch(`${shareBase}/${encodeURIComponent(token)}`, {
    method: "DELETE",
    headers: buildRequestHeaders(),
  });

  if (!response.ok) {
    throw new LibraryApiError(await parseError(response), response.status);
  }
}
