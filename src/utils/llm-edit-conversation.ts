import type { LlmChatMessage } from "@/services/llm/llm-types";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";

export function toLlmChatMessages(
  messages: LlmEditConversationMessage[],
): LlmChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export function createLlmEditConversationMessage(
  role: LlmEditConversationMessage["role"],
  content: string,
): LlmEditConversationMessage {
  return {
    role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
}
