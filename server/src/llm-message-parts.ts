import type { LlmChatMessage } from "./llm-proxy-request.js";

const DATA_URL_BASE64_MARKER = ";base64,";

export function toOpenAiChatMessage(message: LlmChatMessage): {
  role: LlmChatMessage["role"];
  content: string | Array<Record<string, unknown>>;
  reasoning_content?: string;
} {
  const reasoning =
    message.role === "assistant" && message.reasoningContent
      ? { reasoning_content: message.reasoningContent }
      : {};
  if (!message.images?.length) {
    return { role: message.role, content: message.content, ...reasoning };
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
    ...reasoning,
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
