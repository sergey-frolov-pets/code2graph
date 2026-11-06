// @vitest-environment jsdom

import { createApp, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { plantumlLanguageModule } from "@/languages/modules/plantuml";

const hasActiveLlm = ref(false);

vi.mock("@/composables/useHasActiveLlm", () => ({
  useHasActiveLlm: () => ({
    hasActiveLlm,
    refreshActiveLlmAvailability: vi.fn(),
  }),
}));

const { default: EditorToolbar } = await import(
  "@/components/editor/EditorToolbar.vue"
);

function mountToolbar() {
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
          canAiPatch: true,
          canAiSyntaxAsk: true,
          snippetsOpen: false,
          isFullscreen: false,
          surfaceMode: "code",
          builderAvailable: false,
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

function aiButton(host: HTMLElement): HTMLElement | null {
  return host.querySelector(
    '[aria-label="ИИ-помощник"], [aria-label="AI assistant"]',
  );
}

describe("EditorToolbar AI assistant", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    hasActiveLlm.value = false;
  });

  it("hides the AI assistant when no LLM is active", async () => {
    hasActiveLlm.value = false;
    const view = mountToolbar();
    await nextTick();
    expect(aiButton(view.host)).toBeNull();
    view.unmount();
  });

  it("shows the AI assistant when an LLM is active", async () => {
    hasActiveLlm.value = true;
    const view = mountToolbar();
    await nextTick();
    expect(aiButton(view.host)).not.toBeNull();
    view.unmount();
  });
});
