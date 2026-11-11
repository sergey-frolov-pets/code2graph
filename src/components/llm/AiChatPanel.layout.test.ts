// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocale } from "@/composables/useLocale";
import AiChatPanel from "@/components/llm/AiChatPanel.vue";

vi.mock("@/storage/ai-chat-sessions", () => ({
  listAiChatSessions: vi.fn(async () => []),
  putAiChatSession: vi.fn(async (session: unknown) => session),
  deleteAiChatSessions: vi.fn(async () => {}),
  deleteUnpinnedAiChatSessions: vi.fn(async () => {}),
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
    expect(send!.textContent).toContain("Отправить");
    expect((send as HTMLButtonElement).disabled).toBe(true);

    const textarea = view.host.querySelector("textarea");
    expect(textarea).not.toBeNull();
    textarea!.value = "Добавь участника";
    textarea!.dispatchEvent(new Event("input"));
    await nextTick();

    expect((view.host.querySelector("[data-testid='ai-chat-send']") as HTMLButtonElement).disabled).toBe(
      false,
    );

    view.unmount();
  });
});
