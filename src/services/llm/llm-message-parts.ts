import type { LlmChatMessage } from "@/services/llm/llm-types";

const DATA_URL_BASE64_MARKER = ";base64,";

export function toOpenAiChatMessage(message: LlmChatMessage): {
  role: LlmChatMessage["role"];
  content: string | Array<Record<string, unknown>>;
} {
  if (!message.images?.length) {
    return { role: message.role, content: message.content };
  }
  return {
    role: message.role,
    content: [
      { type: "text", text: message.content },
      ...message.images.map((image) => ({
        type: "image_url",
        image_url: {
          url: `data:${image.mimeType}${DATA_URL_BASE64_MARKER}${image.dataBase64}`,
        },
      })),
    ],
  };
}

export function toGeminiContentParts(message: LlmChatMessage): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [{ text: message.content }];
  for (const image of message.images ?? []) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.dataBase64,
      },
    });
  }
  return parts;
}
