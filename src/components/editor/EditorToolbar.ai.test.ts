// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { SESSION_CHANGE_TRACKING_ENABLED } from "@/constants/editor-settings";
import { useLocale } from "@/composables/useLocale";
import { plantumlLanguageModule } from "@/languages/modules/plantuml";
import EditorToolbar from "@/components/editor/EditorToolbar.vue";

function mountToolbar(options: {
  builderAvailable: boolean;
  aiChatAvailable: boolean;
  sessionTrackingEnabled?: boolean;
  surfaceMode?: "code" | "builder" | "ai-chat";
}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      return () =>
        h(EditorToolbar, {
          formatDefinition: plantumlLanguageModule.definition,
          canSave: true,
          isValidating: false,
          isRendering: false,
          canClear: true,
          canConvert: true,
          snippetsOpen: false,
          isFullscreen: false,
          surfaceMode: options.surfaceMode ?? "code",
          builderAvailable: options.builderAvailable,
          aiChatAvailable: options.aiChatAvailable,
          sessionTrackingEnabled: options.sessionTrackingEnabled ?? false,
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

describe("EditorToolbar surface switch", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows Code, Steps and AI chat when all surfaces are available", async () => {
    const view = mountToolbar({ builderAvailable: true, aiChatAvailable: true });
    await nextTick();
    expect(view.host.querySelector('[data-testid="editor-surface-code"]')).not.toBeNull();
    expect(view.host.querySelector('[data-testid="editor-surface-builder"]')).not.toBeNull();
    expect(view.host.querySelector('[data-testid="editor-surface-ai-chat"]')).not.toBeNull();
    view.unmount();
  });

  it("puts a compact show-preview control beside the mode switch in AI chat", async () => {
    useLocale().setLocale("ru");
    const view = mountToolbar({
      builderAvailable: true,
      aiChatAvailable: true,
      surfaceMode: "ai-chat",
    });
    await nextTick();
    const group = view.host.querySelector(".panel-title-group");
    const modeSwitch = group?.querySelector(".editor-surface-switch");
    const preview = group?.querySelector("[data-testid='editor-show-preview']");
    expect(modeSwitch).not.toBeNull();
    expect(preview).not.toBeNull();
    expect(preview?.tagName).toBe("BUTTON");
    expect(preview?.getAttribute("aria-label")).toBe("Показать превью");
    expect(
      modeSwitch!.compareDocumentPosition(preview!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(group?.querySelector(".panel-header__toolbar")).toBeNull();
    view.unmount();
  });

  it("puts a compact show-preview control beside the mode switch in the step editor", async () => {
    useLocale().setLocale("ru");
    const view = mountToolbar({
      builderAvailable: true,
      aiChatAvailable: true,
      surfaceMode: "builder",
    });
    await nextTick();
    const group = view.host.querySelector(".panel-title-group");
    const preview = group?.querySelector("[data-testid='editor-show-preview']");
    expect(preview?.tagName).toBe("BUTTON");
    expect(preview?.getAttribute("aria-label")).toBe("Показать превью");
    view.unmount();
  });

  it("hides show-preview in the code editor", async () => {
    const view = mountToolbar({ builderAvailable: true, aiChatAvailable: true });
    await nextTick();
    expect(view.host.querySelector("[data-testid='editor-show-preview']")).toBeNull();
    view.unmount();
  });

  it("hides AI chat when no LLM is connected (aiChatAvailable=false)", async () => {
    const view = mountToolbar({ builderAvailable: true, aiChatAvailable: false });
    await nextTick();
    expect(view.host.querySelector('[data-testid="editor-surface-ai-chat"]')).toBeNull();
    expect(view.host.querySelector('[data-testid="editor-surface-builder"]')).not.toBeNull();
    view.unmount();
  });

  it("keeps only the mode switch and expand control while AI chat is open", async () => {
    useLocale().setLocale("ru");
    const view = mountToolbar({
      builderAvailable: true,
      aiChatAvailable: true,
      surfaceMode: "ai-chat",
    });
    await nextTick();
    expect(view.host.querySelector('[data-testid="editor-surface-code"]')?.textContent).toContain("Код");
    expect(view.host.querySelector('[data-testid="editor-surface-builder"]')?.textContent).toContain(
      "По шагам",
    );
    expect(view.host.querySelector('[data-testid="editor-surface-ai-chat"]')?.textContent).toContain(
      "ИИ-чат",
    );
    expect(view.host.querySelector(".format-select")).toBeNull();
    expect(view.host.querySelector(".panel-header__toolbar")).toBeNull();
    expect(view.host.querySelector("[data-testid='editor-show-preview']")?.getAttribute("aria-label")).toBe(
      "Показать превью",
    );
    expect(view.host.querySelector('[data-testid="editor-open-file"]')).toBeNull();
    expect(view.host.querySelector(".panel-header__fullscreen")?.getAttribute("aria-label")).toBe(
      "Развернуть",
    );
    view.unmount();
  });

  it("hides the whole switch when neither Steps nor AI chat are available", async () => {
    const view = mountToolbar({ builderAvailable: false, aiChatAvailable: false });
    await nextTick();
    expect(view.host.querySelector(".editor-surface-switch")).toBeNull();
    view.unmount();
  });

  it("has no separate AI assistant menu", async () => {
    const view = mountToolbar({ builderAvailable: true, aiChatAvailable: true });
    await nextTick();
    expect(
      view.host.querySelector('[aria-label="ИИ-помощник"], [aria-label="AI assistant"]'),
    ).toBeNull();
    view.unmount();
  });

  it("puts file and edit actions on the toolbar as buttons", async () => {
    const view = mountToolbar({ builderAvailable: true, aiChatAvailable: false });
    await nextTick();
    const toolbar = view.host.querySelector(".panel-header__toolbar");
    expect(toolbar?.querySelector('[role="menu"]')).toBeNull();
    for (const testId of [
      "editor-open-file",
      "editor-versions",
      "editor-save-file",
      "editor-save-library",
      "editor-undo",
      "editor-redo",
      "editor-validate",
      "editor-convert",
      "editor-clear",
      "editor-snippets",
    ]) {
      const button = toolbar?.querySelector(`[data-testid="${testId}"]`);
      expect(button?.tagName).toBe("BUTTON");
    }
    view.unmount();
  });

  it("hides session compare while change tracking is off and keeps undo and redo", async () => {
    expect(SESSION_CHANGE_TRACKING_ENABLED).toBe(false);
    const view = mountToolbar({ builderAvailable: false, aiChatAvailable: false });
    await nextTick();
    expect(view.host.querySelector('[data-testid="editor-session-file-toggle"]')).toBeNull();
    expect(view.host.querySelector('[data-testid="editor-undo"]')).not.toBeNull();
    expect(view.host.querySelector('[data-testid="editor-redo"]')).not.toBeNull();
    view.unmount();
  });

  it("shows session compare only when change tracking is enabled", async () => {
    const view = mountToolbar({
      builderAvailable: false,
      aiChatAvailable: false,
      sessionTrackingEnabled: true,
    });
    await nextTick();
    expect(view.host.querySelector('[data-testid="editor-session-file-toggle"]')).not.toBeNull();
    view.unmount();
  });
});
