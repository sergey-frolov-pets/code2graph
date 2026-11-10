// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { plantumlLanguageModule } from "@/languages/modules/plantuml";
import EditorToolbar from "@/components/editor/EditorToolbar.vue";

function mountToolbar(options: { builderAvailable: boolean; aiChatAvailable: boolean }) {
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
          surfaceMode: "code",
          builderAvailable: options.builderAvailable,
          aiChatAvailable: options.aiChatAvailable,
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

  it("hides AI chat when no LLM is connected (aiChatAvailable=false)", async () => {
    const view = mountToolbar({ builderAvailable: true, aiChatAvailable: false });
    await nextTick();
    expect(view.host.querySelector('[data-testid="editor-surface-ai-chat"]')).toBeNull();
    expect(view.host.querySelector('[data-testid="editor-surface-builder"]')).not.toBeNull();
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
});
