// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_CHAT_COMPOSER_ROWS, AI_CHAT_SUGGESTION_VISIBLE_LINES } from "@/constants/ai-chat";
import { useLocale } from "@/composables/useLocale";
import { sendAiChatMessage } from "@/services/llm/ai-chat-client";
import AiChatPanel from "@/components/llm/AiChatPanel.vue";

vi.mock("@/storage/ai-chat-sessions", () => ({
  listAiChatSessions: vi.fn(async () => []),
  putAiChatSession: vi.fn(async (session: unknown) => session),
  deleteAiChatSessions: vi.fn(async () => {}),
  deleteUnpinnedAiChatSessions: vi.fn(async () => {}),
}));

vi.mock("@/services/llm/ai-chat-client", () => ({
  sendAiChatMessage: vi.fn(),
}));

const MERMAID_SOURCE = "flowchart LR\n  A --> B";

function mountChat(source = MERMAID_SOURCE) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      return () =>
        h(AiChatPanel, {
          source,
          diagramFormat: "mermaid",
          documentKey: "layout-test",
          layout: "smetana",
          renderMode: "offline",
          diagramDarkMode: false,
        });
    },
  });
  app.mount(host);
  return {
    host,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("AiChatPanel layout", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("places next-step suggestions under the composer and keeps send inside it", async () => {
    useLocale().setLocale("ru");
    const view = mountChat();
    await nextTick();

    const messages = view.host.querySelector("[data-testid='ai-chat-messages']");
    const composer = view.host.querySelector("[data-testid='ai-chat-composer']");
    const next = view.host.querySelector("[data-testid='ai-chat-next']");
    const send = view.host.querySelector("[data-testid='ai-chat-send']");

    expect(messages).not.toBeNull();
    expect(composer).not.toBeNull();
    expect(next).not.toBeNull();
    expect(send).not.toBeNull();
    expect(messages!.compareDocumentPosition(composer!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(composer!.compareDocumentPosition(next!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(composer!.contains(send)).toBe(true);
    expect(next!.textContent).toContain("Что дальше");
    expect(next!.textContent).toContain("Измени текущую диаграмму…");
    expect(view.host.querySelector("[data-testid='ai-chat-attach']")).not.toBeNull();
    const context = view.host.querySelector("[data-testid='ai-chat-context-mode']");
    expect(context).not.toBeNull();
    expect(view.host.querySelector("[data-testid='ai-chat-history']")?.getAttribute("aria-label")).toContain(
      "История",
    );
    expect(view.host.querySelector("[data-testid='ai-chat-context-new']")?.getAttribute("aria-label")).toContain(
      "Новая диаграмма",
    );
    expect((view.host.querySelector("[data-testid='ai-chat-file-input']") as HTMLInputElement).accept).toContain(
      ".md",
    );
    expect((view.host.querySelector("[data-testid='ai-chat-file-input']") as HTMLInputElement).accept).toContain(
      ".xlsx",
    );
    expect(send!.textContent).toContain("Отправить");
    expect((send as HTMLButtonElement).disabled).toBe(true);

    const textarea = view.host.querySelector("textarea");
    expect(textarea).not.toBeNull();
    expect(textarea).toHaveProperty("rows", AI_CHAT_COMPOSER_ROWS);
    textarea!.value = "Добавь участника";
    textarea!.dispatchEvent(new Event("input"));
    await nextTick();

    expect((view.host.querySelector("[data-testid='ai-chat-send']") as HTMLButtonElement).disabled).toBe(
      false,
    );

    view.unmount();
  });

  it("switches starter chips to a new diagram and accepts a markdown file", async () => {
    useLocale().setLocale("ru");
    const view = mountChat();
    await nextTick();

    const contextNew = view.host.querySelector("[data-testid='ai-chat-context-new']") as HTMLButtonElement;
    contextNew.click();
    await nextTick();

    expect(view.host.querySelector("[data-testid='ai-chat-next']")!.textContent).toContain(
      "Создай диаграмму по описанию",
    );

    const input = view.host.querySelector("[data-testid='ai-chat-file-input']") as HTMLInputElement;
    const file = new File(["# Actors\nAlice"], "actors.md", { type: "text/markdown" });
    Object.defineProperty(input, "files", {
      configurable: true,
      value: {
        0: file,
        length: 1,
        item: (index: number) => (index === 0 ? file : null),
        *[Symbol.iterator]() {
          yield file;
        },
      },
    });
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => {
      expect(view.host.textContent).toContain("actors.md");
    });

    expect(view.host.textContent).toContain("actors.md");
    expect(view.host.textContent).toContain("Markdown");
    expect((view.host.querySelector("[data-testid='ai-chat-send']") as HTMLButtonElement).disabled).toBe(
      false,
    );

    view.unmount();
  });

  it("opens a two-line suggestion in a scrollable preview and sends it only after Ask", async () => {
    useLocale().setLocale("ru");
    vi.mocked(sendAiChatMessage).mockResolvedValue({
      kind: "answer",
      message: "Готово",
      providerId: "test",
      model: "stub",
    });
    const view = mountChat();
    await nextTick();

    const panel = view.host.querySelector(".ai-chat-panel") as HTMLElement;
    expect(panel.style.getPropertyValue("--ai-chat-chip-lines")).toBe(
      String(AI_CHAT_SUGGESTION_VISIBLE_LINES),
    );
    expect(panel.style.getPropertyValue("--ai-chat-composer-rows")).toBe(String(AI_CHAT_COMPOSER_ROWS));

    const chip = view.host.querySelector(".ai-chat-panel__chip") as HTMLButtonElement | null;
    expect(chip).not.toBeNull();
    const chipText = chip!.querySelector(".ai-chat-panel__chip-text") as HTMLElement;
    expect(chipText).not.toBeNull();
    const suggestion = chipText.textContent ?? "";
    expect(suggestion.length).toBeGreaterThan(0);

    chip!.click();
    await nextTick();

    const dialog = document.body.querySelector("[data-testid='ai-chat-suggestion']");
    expect(dialog).not.toBeNull();
    const preview = dialog!.querySelector(".ai-chat-panel__suggestion-text") as HTMLElement;
    expect(preview.textContent).toContain(suggestion);
    expect(dialog!.textContent).toContain("Спросить");
    expect(sendAiChatMessage).not.toHaveBeenCalled();
    expect((view.host.querySelector("[data-testid='ai-chat-send']") as HTMLButtonElement).disabled).toBe(
      true,
    );

    const cancel = [...dialog!.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Отмена"),
    ) as HTMLButtonElement;
    cancel.click();
    await nextTick();
    expect(document.body.querySelector("[data-testid='ai-chat-suggestion']")).toBeNull();
    expect(sendAiChatMessage).not.toHaveBeenCalled();

    chip!.click();
    await nextTick();
    const ask = document.body.querySelector(
      "[data-testid='ai-chat-suggestion-ask']",
    ) as HTMLButtonElement;
    ask.click();
    await vi.waitFor(() => {
      expect(sendAiChatMessage).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(sendAiChatMessage).mock.calls[0]?.[0]).toMatchObject({
      userContent: suggestion,
    });
    expect(document.body.querySelector("[data-testid='ai-chat-suggestion']")).toBeNull();

    view.unmount();
  });
});
