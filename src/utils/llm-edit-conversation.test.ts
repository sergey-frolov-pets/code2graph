import { describe, expect, it } from "vitest";
import { LLM_EDIT_CONVERSATION_MAX_MESSAGES } from "@/constants/llm-edit-conversation";
import { pruneLlmEditConversationMessages } from "@/storage/llm-edit-conversation";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";
import {
  createLlmEditConversationMessage,
  toLlmChatMessages,
} from "@/utils/llm-edit-conversation";

function createMessage(
  role: LlmEditConversationMessage["role"],
  content: string,
): LlmEditConversationMessage {
  return {
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

describe("llm-edit-conversation utils", () => {
  it("converts stored messages to llm chat messages", () => {
    const messages = [
      createMessage("user", "add error handling"),
      createMessage("assistant", "Added try/catch block"),
    ];

    expect(toLlmChatMessages(messages)).toEqual([
      { role: "user", content: "add error handling" },
      { role: "assistant", content: "Added try/catch block" },
    ]);
  });

  it("creates trimmed conversation messages", () => {
    const message = createLlmEditConversationMessage("user", "  rename actor  ");

    expect(message).toMatchObject({
      role: "user",
      content: "rename actor",
    });
    expect(message.createdAt).toBeTruthy();
  });
});

describe("pruneLlmEditConversationMessages", () => {
  it("keeps only the latest messages when limit is exceeded", () => {
    const messages = Array.from({ length: LLM_EDIT_CONVERSATION_MAX_MESSAGES + 2 }, (_, index) =>
      createMessage("user", `message-${index}`),
    );

    const pruned = pruneLlmEditConversationMessages(messages);

    expect(pruned).toHaveLength(LLM_EDIT_CONVERSATION_MAX_MESSAGES);
    expect(pruned[0]?.content).toBe("message-2");
    expect(pruned.at(-1)?.content).toBe(`message-${LLM_EDIT_CONVERSATION_MAX_MESSAGES + 1}`);
  });
});
