// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDictationForTests } from "@/composables/useDictation";
import {
  DICTATION_LOCALE_ORDER,
  DICTATION_SPEECH_TAGS,
} from "@/constants/dictation";
import type { DictationAvailabilityQuery, DictationSpeechEvent } from "@/utils/dictation-speech";
import { AI_CHAT_MESSAGE_MAX_CHARS } from "@/constants/ai-chat";
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
  sendAiChatMessage: vi.fn(async () => ({
    kind: "answer",
    message: "ok",
    providerId: "test",
    model: "test",
  })),
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
  beforeEach(() => {
    resetDictationForTests();
  });

  afterEach(() => {
    resetDictationForTests();
    document.body.innerHTML = "";
  });

  it("places next-step suggestions above the composer and keeps send inside it", async () => {
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
    expect(messages!.compareDocumentPosition(next!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(next!.compareDocumentPosition(composer!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(composer!.contains(send)).toBe(true);
    expect(next!.getAttribute("aria-label")).toContain("Что дальше");
    expect(next!.querySelector(".ai-chat-panel__next-label")).toBeNull();
    expect(next!.textContent).toContain("Измени текущую диаграмму…");
    expect(view.host.querySelector("[data-testid='ai-chat-attach']")).not.toBeNull();
    expect(view.host.querySelector("[data-testid='ai-chat-mic']")).toBeNull();
    const context = view.host.querySelector("[data-testid='ai-chat-context-mode']");
    const line = view.host.querySelector("[data-testid='ai-chat-composer-line']");
    expect(context).not.toBeNull();
    expect(line).not.toBeNull();
    expect(composer!.contains(context)).toBe(true);
    expect(line!.contains(context)).toBe(false);
    const provider = view.host.querySelector("[data-testid='ai-chat-provider']");
    const modes = view.host.querySelector(".ai-chat-panel__modes");
    expect(provider).not.toBeNull();
    expect(modes!.contains(provider)).toBe(true);
    expect(line!.contains(provider)).toBe(false);
    expect(view.host.querySelector(".ai-chat-panel__toolbar")!.contains(provider)).toBe(false);
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
    expect(textarea).toHaveProperty("rows", 1);
    expect(line!.contains(textarea)).toBe(true);
    expect(textarea!.getAttribute("placeholder")).toBe("Сообщение…");
    textarea!.focus();
    await nextTick();
    expect(view.host.querySelector("[data-testid='ai-chat-next']")).toBeNull();
    textarea!.blur();
    await nextTick();
    expect(view.host.querySelector("[data-testid='ai-chat-next']")).not.toBeNull();
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

  it("opens session search over the thread and copies the chat instead of sharing", async () => {
    useLocale().setLocale("ru");
    const view = mountChat();
    await nextTick();

    expect(view.host.querySelector("[aria-label='Поделиться']")).toBeNull();
    expect(view.host.querySelector("[data-testid='ai-chat-copy']")?.getAttribute("aria-label")).toBe(
      "Скопировать чат",
    );

    (view.host.querySelector("[data-testid='ai-chat-history']") as HTMLButtonElement).click();
    await nextTick();

    const messages = view.host.querySelector("[data-testid='ai-chat-messages']");
    const sheet = view.host.querySelector("[data-testid='ai-chat-history-sheet']");
    expect(messages).not.toBeNull();
    expect(sheet).not.toBeNull();
    expect(sheet!.parentElement).toBe(messages!.parentElement);
    expect(sheet!.querySelector("[data-testid='ai-chat-history-search']")).not.toBeNull();
    expect(sheet!.querySelector("ul")).not.toBeNull();
    expect(sheet!.textContent).not.toContain("Создать ссылку");

    view.unmount();
  });

  it("sends a suggestion on click and previews it on a long press", async () => {
    useLocale().setLocale("ru");
    vi.mocked(sendAiChatMessage).mockClear();
    const view = mountChat();
    await nextTick();

    const chip = view.host.querySelector("[data-testid='ai-chat-suggestion']") as HTMLButtonElement;
    const suggestion = chip.textContent?.trim() ?? "";
    expect(suggestion.length).toBeGreaterThan(0);
    chip.click();
    await vi.waitFor(() => {
      expect(sendAiChatMessage).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(sendAiChatMessage).mock.calls[0]?.[0]).toMatchObject({
      userContent: suggestion,
    });
    await vi.waitFor(() => {
      expect(view.host.querySelector(".ai-chat-panel__message-actions")).not.toBeNull();
    });
    const actions = view.host.querySelector(".ai-chat-panel__message-actions") as HTMLElement;
    const content = actions.parentElement?.querySelector(".ai-chat-panel__content");
    expect(content).not.toBeNull();
    expect(content!.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getComputedStyle(actions).position).not.toBe("absolute");

    const userContent = view.host.querySelector(
      ".ai-chat-panel__message--user .ai-chat-panel__content",
    ) as HTMLElement;
    userContent.click();
    await nextTick();
    const userMessage = view.host.querySelector(".ai-chat-panel__message--user");
    expect(userMessage!.classList.contains("is-picked")).toBe(true);
    (userMessage!.querySelector("[data-testid='ai-chat-edit']") as HTMLButtonElement).click();
    await nextTick();
    expect((view.host.querySelector("textarea") as HTMLTextAreaElement).value).toBe(suggestion);
    expect(view.host.querySelector(".ai-chat-panel__message--user")).toBeNull();

    view.unmount();

    vi.mocked(sendAiChatMessage).mockClear();
    const preview = mountChat();
    await nextTick();
    const held = preview.host.querySelector("[data-testid='ai-chat-suggestion']") as HTMLButtonElement;
    const heldText = held.textContent?.trim() ?? "";
    held.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: "touch",
      }),
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 450);
    });
    await nextTick();

    const dialog = preview.host.querySelector("[data-testid='ai-chat-suggestion-preview']");
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain(heldText);
    expect(dialog!.textContent).toContain("Отправить");
    expect(dialog!.querySelector("[data-testid='ai-chat-suggestion-cancel']")).toBeNull();
    expect(sendAiChatMessage).not.toHaveBeenCalled();

    held.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch" }));
    held.click();
    await nextTick();
    expect(sendAiChatMessage).not.toHaveBeenCalled();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();
    expect(preview.host.querySelector("[data-testid='ai-chat-suggestion-preview']")).toBeNull();
    expect(sendAiChatMessage).not.toHaveBeenCalled();

    held.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerId: 2,
        pointerType: "touch",
      }),
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 450);
    });
    await nextTick();
    (preview.host.querySelector("[data-testid='ai-chat-suggestion-send']") as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(sendAiChatMessage).toHaveBeenCalledTimes(1);
    });

    preview.unmount();
  });

  it("closes a hovered suggestion when the pointer leaves and skips it while modes are open", async () => {
    useLocale().setLocale("ru");
    const view = mountChat();
    await nextTick();

    const chip = view.host.querySelector("[data-testid='ai-chat-suggestion']") as HTMLButtonElement;
    const suggestion = chip.textContent?.trim() ?? "";
    chip.dispatchEvent(new MouseEvent("mouseenter"));
    await nextTick();
    expect(view.host.querySelector("[data-testid='ai-chat-suggestion-preview']")?.textContent).toContain(
      suggestion,
    );

    view.host.querySelector("[data-testid='ai-chat-next']")!.dispatchEvent(new MouseEvent("mouseleave"));
    await new Promise((resolve) => {
      setTimeout(resolve, 220);
    });
    await nextTick();
    expect(view.host.querySelector("[data-testid='ai-chat-suggestion-preview']")).toBeNull();

    (view.host.querySelector("[data-testid='ai-chat-modes']") as HTMLButtonElement).click();
    await nextTick();
    chip.dispatchEvent(new MouseEvent("mouseenter"));
    await nextTick();
    expect(view.host.querySelector("[data-testid='ai-chat-suggestion-preview']")).toBeNull();
    expect(view.host.querySelector(".ai-chat-panel__composer-box")?.classList.contains("is-modes-open")).toBe(
      true,
    );

    view.unmount();
  });

  it("attaches an oversized paste as a text file and leaves a short paste in the field", async () => {
    useLocale().setLocale("ru");
    const view = mountChat();
    await nextTick();

    const textarea = view.host.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "Краткий запрос";
    textarea.dispatchEvent(new Event("input"));
    await nextTick();

    function paste(text: string): Event {
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", {
        value: {
          getData: (type: string) => (type === "text/plain" ? text : ""),
        },
      });
      textarea.dispatchEvent(event);
      return event;
    }

    const shortPaste = paste(" и ещё строка");
    expect(shortPaste.defaultPrevented).toBe(false);
    expect(view.host.querySelector("[data-testid='ai-chat-attachments']")).toBeNull();
    expect(textarea.value).toBe("Краткий запрос");

    const longPaste = paste(`${"а".repeat(AI_CHAT_MESSAGE_MAX_CHARS)} хвост`);
    expect(longPaste.defaultPrevented).toBe(true);
    await nextTick();

    const attachments = view.host.querySelector("[data-testid='ai-chat-attachments']");
    expect(attachments).not.toBeNull();
    expect(attachments!.textContent).toContain("pasted.txt");
    expect(attachments!.textContent).toContain("Текст");
    expect(view.host.textContent).toContain("Большой текст прикреплён файлом pasted.txt.");
    expect(textarea.value).toBe("Краткий запрос");

    view.unmount();
  });

  it("dictates into the composer and does not send on its own", async () => {
    class FakeRecognition {
      static calls: string[] = [];
      static latest: FakeRecognition | null = null;

      static available(options: DictationAvailabilityQuery): Promise<string> {
        const tag = options.langs[0] ?? "";
        FakeRecognition.calls.push(tag);
        return Promise.resolve(tag === "ru-RU" || tag === "en-US" ? "available" : "unavailable");
      }

      lang = "";
      continuous = false;
      interimResults = false;
      onresult: ((event: DictationSpeechEvent) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      startCount = 0;

      start(): void {
        this.startCount += 1;
        FakeRecognition.latest = this;
      }

      stop(): void {
        this.onend?.();
      }
    }

    (window as unknown as { SpeechRecognition?: typeof FakeRecognition }).SpeechRecognition =
      FakeRecognition;
    useLocale().setLocale("ru");
    vi.mocked(sendAiChatMessage).mockClear();
    const view = mountChat();

    const mic = await vi.waitFor(() => {
      const button = view.host.querySelector("[data-testid='ai-chat-mic']");
      expect(button).not.toBeNull();
      return button as HTMLButtonElement;
    });

    const composer = view.host.querySelector("[data-testid='ai-chat-composer']");
    expect(composer!.contains(mic)).toBe(true);
    expect(FakeRecognition.calls).toEqual(
      DICTATION_LOCALE_ORDER.map((locale) => DICTATION_SPEECH_TAGS[locale]),
    );
    expect(FakeRecognition.calls).not.toContain("fr-FR");

    expect(view.host.querySelector("[data-testid='ai-chat-recording']")).toBeNull();

    mic.click();
    await nextTick();
    expect(mic.getAttribute("aria-pressed")).toBe("true");
    expect(mic.classList.contains("is-listening")).toBe(true);
    const recording = view.host.querySelector("[data-testid='ai-chat-recording']");
    expect(recording).not.toBeNull();
    expect(recording!.getAttribute("role")).toBe("status");
    expect(recording!.textContent).toContain("Идёт запись с микрофона");
    expect(composer!.contains(recording)).toBe(false);
    const composerBox = view.host.querySelector(".ai-chat-panel__composer-box");
    expect(composerBox?.classList.contains("is-recording")).toBe(true);
    const recognition = FakeRecognition.latest;
    expect(recognition).not.toBeNull();
    recognition!.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: false, 0: { transcript: "Добавь участника" } }],
    });
    await nextTick();

    const textarea = view.host.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Добавь участника");
    expect(sendAiChatMessage).not.toHaveBeenCalled();

    mic.click();
    await nextTick();
    expect(mic.getAttribute("aria-pressed")).toBe("false");
    expect(view.host.querySelector("[data-testid='ai-chat-recording']")).toBeNull();
    expect(composerBox?.classList.contains("is-recording")).toBe(false);
    expect(textarea.value).toBe("Добавь участника");
    expect(recognition!.startCount).toBe(1);
    expect(sendAiChatMessage).not.toHaveBeenCalled();

    view.unmount();
  });
});
