// @vitest-environment jsdom

import { createApp, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import AppearanceModal from "@/components/AppearanceModal.vue";
import { PREVIEW_BG_PRESETS, TRANSPARENT_PREVIEW_BG } from "@/constants/editor-settings";

const lightPreset = PREVIEW_BG_PRESETS.find((preset) => preset.id === "light")!.value;
const darkPreset = PREVIEW_BG_PRESETS.find((preset) => preset.id === "dark")!.value;

function mountAppearance(initialBackground: string) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const background = ref(initialBackground);

  const app = createApp({
    setup() {
      return () =>
        h(AppearanceModal, {
          open: true,
          background: background.value,
          textColor: "",
          fontFamily: "sans",
          fontWeight: "400",
          fontStyle: "normal",
          "onUpdate:background": (value: string) => {
            background.value = value;
          },
        });
    },
  });

  app.mount(host);

  return {
    background,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

function colorInput(): HTMLInputElement {
  const input = document.querySelector("input.appearance__color");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("color input not found");
  }
  return input;
}

function presetPressed(presetId: "light" | "dark"): string | null {
  const index = PREVIEW_BG_PRESETS.findIndex((preset) => preset.id === presetId);
  const button = document.querySelectorAll(".appearance__preset")[index];
  return button?.getAttribute("aria-pressed") ?? null;
}

function transparentPressed(): string | null {
  return document.querySelector(".appearance__toggle")?.getAttribute("aria-pressed") ?? null;
}

describe("Свой цвет в окне оформления", () => {
  let mounted: ReturnType<typeof mountAppearance> | null = null;

  afterEach(() => {
    mounted?.unmount();
    mounted = null;
    document.body.innerHTML = "";
  });

  it("белый выключает прозрачный и включает «Белый фон»", async () => {
    mounted = mountAppearance(TRANSPARENT_PREVIEW_BG);
    await nextTick();

    const input = colorInput();
    expect(input.value).toBe(lightPreset);

    input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(input.value).not.toBe(lightPreset);

    input.value = lightPreset;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();

    expect(mounted.background.value).toBe(lightPreset);
    expect(transparentPressed()).toBe("false");
    expect(presetPressed("light")).toBe("true");
    expect(presetPressed("dark")).toBe("false");
  });

  it("чёрный выключает прозрачный и включает «Тёмный фон»", async () => {
    mounted = mountAppearance(TRANSPARENT_PREVIEW_BG);
    await nextTick();

    const input = colorInput();
    input.value = "#000000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();

    expect(mounted.background.value).toBe(darkPreset);
    expect(transparentPressed()).toBe("false");
    expect(presetPressed("dark")).toBe("true");
    expect(presetPressed("light")).toBe("false");
  });

  it("закрытие пикера без выбора не снимает прозрачность", async () => {
    mounted = mountAppearance(TRANSPARENT_PREVIEW_BG);
    await nextTick();

    const input = colorInput();
    input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const nudged = input.value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();

    expect(mounted.background.value).toBe(TRANSPARENT_PREVIEW_BG);
    expect(input.value).toBe(lightPreset);
    expect(nudged).not.toBe(lightPreset);
    expect(transparentPressed()).toBe("true");
  });
});
