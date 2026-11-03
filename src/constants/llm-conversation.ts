export const LLM_CONVERSATION_KINDS = ["patch", "syntax-ask", "wizard-plan", "wizard-refine"] as const;

export type LlmConversationKind = (typeof LLM_CONVERSATION_KINDS)[number];
