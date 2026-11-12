import { beforeEach, describe, expect, it, vi } from "vitest";
import { LAYOUT_ENGINES } from "@/constants";
import { RENDER_MODES } from "@/constants/render-settings";
import { sendAiChatMessage } from "@/services/llm/ai-chat-client";
import { llmChat } from "@/services/llm/llm-client";
import type { LlmChatOptions, LlmChatResult } from "@/services/llm/llm-types";

vi.mock("@/config/llm-accounts", () => ({
  readChatLlmAccess: () => ({ providerId: "openai", accountId: "test", model: "test" }),
}));

vi.mock("@/services/llm/llm-client", () => ({
  llmChat: vi.fn(),
}));

function chatResult(content: string): LlmChatResult {
  return {
    content,
    providerId: "openai",
    model: "test",
  };
}

const baseInput = {
  history: [],
  userContent: "нарисуй столбцы и линию плана",
  format: "mermaid" as const,
  source: "series\ncategories Q1\nseries Продукт : 10",
  layout: LAYOUT_ENGINES.elk,
  diagramDarkMode: false,
  renderMode: RENDER_MODES.offline,
};

describe("sendAiChatMessage syntax pages", () => {
  beforeEach(() => {
    vi.mocked(llmChat).mockReset();
  });

  it("returns a normal envelope from the first call without a second request", async () => {
    const onOutputStart = vi.fn();
    vi.mocked(llmChat).mockResolvedValueOnce(
      chatResult('{"kind":"answer","message":"Это столбцы по кварталам.","nextSteps":["Добавь ряд"]}'),
    );

    const result = await sendAiChatMessage({ ...baseInput, onOutputStart });

    expect(result.kind).toBe("answer");
    expect(result.message).toContain("столбцы");
    expect(llmChat).toHaveBeenCalledTimes(1);
    const firstOptions = vi.mocked(llmChat).mock.calls[0]?.[1] as LlmChatOptions;
    expect(firstOptions.onOutputStart).toBeUndefined();
    expect(onOutputStart).not.toHaveBeenCalled();
    const system = String(vi.mocked(llmChat).mock.calls[0]?.[0][0]?.content);
    expect(system).toContain("mermaid/ext/series-analytics.md");
    expect(system).not.toContain("line 160");
  });

  it("loads every requested page on the second call and hides that request", async () => {
    const onOutputStart = vi.fn();
    vi.mocked(llmChat)
      .mockResolvedValueOnce(
        chatResult(
          '{"kind":"read_pages","paths":["mermaid/ext/series.md","mermaid/ext/series-analytics.md","../secret.md"]}',
        ),
      )
      .mockResolvedValueOnce(
        chatResult('{"kind":"answer","message":"Добавил линию плана.","nextSteps":["Проверь CAGR"]}'),
      );

    const result = await sendAiChatMessage({ ...baseInput, onOutputStart });

    expect(result.kind).toBe("answer");
    expect(result.message).toContain("линию плана");
    expect(llmChat).toHaveBeenCalledTimes(2);
    const secondOptions = vi.mocked(llmChat).mock.calls[1]?.[1] as LlmChatOptions;
    expect(secondOptions.onOutputStart).toBe(onOutputStart);
    const secondSystem = String(vi.mocked(llmChat).mock.calls[1]?.[0][0]?.content);
    expect(secondSystem).toContain("The first line is only");
    expect(secondSystem).toContain("line 160");
    expect(secondSystem).toContain("selects the Mermaid Ext type");
    expect(secondSystem).not.toContain("../secret.md");
  });

  it("does not fetch pages again when the second reply asks for more", async () => {
    vi.mocked(llmChat)
      .mockResolvedValueOnce(
        chatResult('{"kind":"read_pages","paths":["mermaid/ext/series.md"]}'),
      )
      .mockResolvedValueOnce(chatResult('{"kind":"read_pages","paths":["mermaid/ext/bubble.md"]}'))
      .mockResolvedValueOnce(
        chatResult('{"kind":"answer","message":"Готово.","nextSteps":["Проверь подписи"]}'),
      );

    const result = await sendAiChatMessage(baseInput);

    expect(result.kind).toBe("answer");
    expect(llmChat).toHaveBeenCalledTimes(3);
    const thirdSystem = String(vi.mocked(llmChat).mock.calls[2]?.[0][0]?.content);
    expect(thirdSystem).toContain("Page: mermaid/ext/series.md");
    expect(thirdSystem).not.toContain("Page: mermaid/ext/bubble.md");
  });
});
