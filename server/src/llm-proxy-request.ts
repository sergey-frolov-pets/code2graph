import type { FreeBuiltinLlmProviderId } from "./llm-providers.js";
import { isFreeBuiltinLlmProviderId } from "./llm-providers.js";
import {
  LLM_IMAGE_MIME_TYPES,
  LLM_MAX_IMAGES_PER_REQUEST,
  LLM_MAX_IMAGE_BASE64_CHARS,
  LLM_MAX_MESSAGES,
  LLM_MAX_MESSAGE_CHARS,
  LLM_MAX_TOTAL_CHARS,
} from "./config.js";

export type LlmChatRole = "system" | "user" | "assistant";

export interface LlmChatImagePart {
  mimeType: string;
  dataBase64: string;
}

export interface LlmChatMessage {
  role: LlmChatRole;
  content: string;
  images?: LlmChatImagePart[];
  reasoningContent?: string;
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

  if (messages.length > LLM_MAX_MESSAGES) {
    return null;
  }

  const parsedMessages: LlmChatMessage[] = [];
  let totalChars = 0;
  let imageCount = 0;

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

    if (content.length > LLM_MAX_MESSAGE_CHARS) {
      return null;
    }

    totalChars += content.length;
    if (totalChars > LLM_MAX_TOTAL_CHARS) {
      return null;
    }

    const images = parseMessageImages(role, message.images, imageCount);
    if (!images) {
      return null;
    }
    imageCount += images.length;

    const reasoningContent = readReasoningContent(role, message.reasoningContent);
    const keptReasoning =
      reasoningContent && totalChars + reasoningContent.length <= LLM_MAX_TOTAL_CHARS
        ? reasoningContent
        : undefined;
    if (keptReasoning) {
      totalChars += keptReasoning.length;
    }
    parsedMessages.push({
      role,
      content,
      ...(images.length > 0 ? { images } : {}),
      ...(keptReasoning ? { reasoningContent: keptReasoning } : {}),
    });
  }

  return {
    providerId,
    messages: parsedMessages,
    jsonMode: jsonMode === true,
  };
}

function readReasoningContent(role: string, raw: unknown): string | undefined {
  if (role !== "assistant" || typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LLM_MAX_MESSAGE_CHARS) {
    return undefined;
  }
  return trimmed;
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function parseMessageImages(
  role: string,
  raw: unknown,
  imageCount: number,
): LlmChatImagePart[] | null {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  if (raw.length === 0) {
    return [];
  }
  if (role !== "user") {
    return null;
  }
  if (imageCount + raw.length > LLM_MAX_IMAGES_PER_REQUEST) {
    return null;
  }

  const images: LlmChatImagePart[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const record = item as Record<string, unknown>;
    const mimeType = record.mimeType;
    const dataBase64 = record.dataBase64;
    if (typeof mimeType !== "string" || !(LLM_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return null;
    }
    if (typeof dataBase64 !== "string" || !BASE64_PATTERN.test(dataBase64)) {
      return null;
    }
    if (dataBase64.length === 0 || dataBase64.length > LLM_MAX_IMAGE_BASE64_CHARS) {
      return null;
    }
    images.push({ mimeType, dataBase64 });
  }
  return images;
}
