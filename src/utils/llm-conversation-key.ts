import type { LlmConversationKind } from "@/constants/llm-conversation";

export function buildLlmConversationKey(
  documentKey: string,
  kind: LlmConversationKind,
): string {
  const trimmed = documentKey.trim();
  if (!trimmed) {
    return `__anonymous__::${kind}`;
  }

  if (kind === "patch") {
    return trimmed;
  }

  return `${trimmed}::${kind}`;
}
