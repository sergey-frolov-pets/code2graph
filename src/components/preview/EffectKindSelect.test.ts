// @vitest-environment jsdom

import { createApp, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import EffectKindSelect from "@/components/preview/EffectKindSelect.vue";
import type { TranslateFn } from "@/locales/types";
import { FRAME_EFFECT_KINDS, type FrameEffectKind } from "@/services/presentation/types";

const translate = ((key: string) => key) as TranslateFn;

function mount(kind: FrameEffectKind = "fade") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const current = ref(kind);
  const onChange = vi.fn((next: FrameEffectKind) => {
    current.value = next;
  });
  const app = createApp({
    setup() {
      return () => h(EffectKindSelect, {
        kind: current.value,
        t: translate,
        onChange,
      });
    },
  });
  app.mount(host);
  return {
    host,
    onChange,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("effect kind menu", () => {
  const mounted: Array<{ unmount: () => void }> = [];

  afterEach(() => {
    for (const view of mounted.splice(0)) {
      view.unmount();
    }
  });

  it("shows an icon for every effect in the list", async () => {
    const view = mount();
    mounted.push(view);
    await nextTick();

    const trigger = view.host.querySelector("[aria-haspopup='listbox']");
    expect(trigger?.querySelector("svg")).not.toBeNull();
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    const options = document.body.querySelectorAll("[data-effect-kind]");
    expect(options).toHaveLength(FRAME_EFFECT_KINDS.length);
    for (const kind of FRAME_EFFECT_KINDS) {
      const option = document.body.querySelector(`[data-effect-kind='${kind}']`);
      expect(option?.querySelector("svg")).not.toBeNull();
    }

    document.body.querySelector("[data-effect-kind='flyInLeft']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(view.onChange).toHaveBeenCalledWith("flyInLeft");
  });
});
