export type LlmEditConversationRole = "user" | "assistant";

export interface LlmEditConversationMessage {
  role: LlmEditConversationRole;
  content: string;
  createdAt: string;
}

export interface LlmEditConversation {
  documentKey: string;
  messages: LlmEditConversationMessage[];
  updatedAt: string;
}
