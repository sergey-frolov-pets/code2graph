export type LlmChatRole = "system" | "user" | "assistant";

export interface LlmChatMessage {
  role: LlmChatRole;
  content: string;
}

export interface LlmChatOptions {
  jsonMode?: boolean;
  temperature?: number;
}

export interface LlmChatResult {
  content: string;
  providerId: string;
  model: string;
}

export class LlmClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LlmClientError";
    this.code = code;
  }
}
