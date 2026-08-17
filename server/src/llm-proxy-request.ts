import type { FreeBuiltinLlmProviderId } from "./llm-providers.js";
import { isFreeBuiltinLlmProviderId } from "./llm-providers.js";

export type LlmChatRole = "system" | "user" | "assistant";

export interface LlmChatMessage {
  role: LlmChatRole;
  content: string;
}

export interface LlmProxyChatRequestBody {
  providerId: FreeBuiltinLlmProviderId;
  messages: LlmChatMessage[];
  jsonMode?: boolean;
}

/** Client must never send BYOK secrets to our API — reject if present. */
export const FORBIDDEN_CLIENT_LLM_KEY_FIELDS = [
  "apiKey",
  "api_key",
  "apiKeys",
  "llmApiKey",
] as const;

export function containsForbiddenClientLlmKeyField(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") {
    return false;
  }

  const record = raw as Record<string, unknown>;
  return FORBIDDEN_CLIENT_LLM_KEY_FIELDS.some(
    (field) => record[field] !== undefined && record[field] !== null,
  );
}

export function parseLlmProxyChatBody(raw: unknown): LlmProxyChatRequestBody | null {
  if (containsForbiddenClientLlmKeyField(raw)) {
    return null;
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const providerId = record.providerId;
  const messages = record.messages;
  const jsonMode = record.jsonMode;

  if (typeof providerId !== "string" || !isFreeBuiltinLlmProviderId(providerId)) {
    return null;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const parsedMessages: LlmChatMessage[] = [];

  for (const item of messages) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const message = item as Record<string, unknown>;
    const role = message.role;
    const content = message.content;

    if (role !== "system" && role !== "user" && role !== "assistant") {
      return null;
    }

    if (typeof content !== "string" || !content.trim()) {
      return null;
    }

    parsedMessages.push({ role, content });
  }

  return {
    providerId,
    messages: parsedMessages,
    jsonMode: jsonMode === true,
  };
}
