// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WizardFavoriteCard } from "@/constants/wizard-favorites";
import WizardFavoriteStrip from "@/components/wizard/WizardFavoriteStrip.vue";
import { useLocale } from "@/composables/useLocale";

class TestDragEvent extends Event {
  dataTransfer: { effectAllowed: string; dropEffect: string; setData: (type: string, value: string) => void } | null;

  constructor(
    type: string,
    dataTransfer: { effectAllowed: string; dropEffect: string; setData: (type: string, value: string) => void } | null,
  ) {
    super(type, { bubbles: true, cancelable: true });
    this.dataTransfer = dataTransfer;
  }
}

function dragEvent(
  type: string,
  dataTransfer: { effectAllowed: string; dropEffect: string; setData: (type: string, value: string) => void },
): Event {
  return new TestDragEvent(type, dataTransfer);
}

function card(id: string, title: string, canMoveEarlier: boolean, canMoveLater: boolean): WizardFavoriteCard {
  return {
    id,
    title,
    kind: "local",
    svg: null,
    canOpen: true,
    canMoveEarlier,
    canMoveLater,
  };
}

function mountStrip(options: {
  items: WizardFavoriteCard[];
  onMoveLater?: (id: string) => void;
  onMoveBefore?: (id: string, targetId: string) => void;
  onSubmitLink?: () => void;
  onToggleLocal?: () => void;
}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const linkDraft = { value: "" };
  const app = createApp({
    setup() {
      return () =>
        h(WizardFavoriteStrip, {
          items: options.items,
          localDiagrams: [],
          localOpen: false,
          linkDraft: linkDraft.value,
          linkError: "",
          notice: "",
          busy: false,
          "onUpdate:linkDraft": (value: string) => {
            linkDraft.value = value;
          },
          onMoveLater: options.onMoveLater,
          onMoveBefore: options.onMoveBefore,
          onSubmitLink: options.onSubmitLink,
          onToggleLocal: options.onToggleLocal,
        });
    },
  });
  app.mount(host);

  return {
    host,
    linkDraft,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("WizardFavoriteStrip", () => {
  let mounted: ReturnType<typeof mountStrip> | null = null;

  afterEach(() => {
    mounted?.unmount();
    mounted = null;
    document.body.innerHTML = "";
  });

  it("moves a favorite later and drops it before another card", async () => {
    const onMoveLater = vi.fn();
    const onMoveBefore = vi.fn();
    mounted = mountStrip({
      items: [
        card("first", "First", false, true),
        card("second", "Second", true, false),
      ],
      onMoveLater,
      onMoveBefore,
    });
    await nextTick();

    const laterButtons = mounted.host.querySelectorAll<HTMLButtonElement>(
      "[data-testid='wizard-favorite-later']",
    );
    expect(laterButtons[0]?.disabled).toBe(false);
    expect(laterButtons[1]?.disabled).toBe(true);
    laterButtons[0]?.click();
    expect(onMoveLater).toHaveBeenCalledWith("first");

    const handle = mounted.host.querySelector<HTMLButtonElement>(".wizard-favorites__handle");
    const cards = mounted.host.querySelectorAll<HTMLElement>(".wizard-favorites__card");
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
    };
    handle?.dispatchEvent(dragEvent("dragstart", dataTransfer));
    cards[1]?.dispatchEvent(dragEvent("dragover", dataTransfer));
    cards[1]?.dispatchEvent(dragEvent("drop", dataTransfer));
    expect(onMoveBefore).toHaveBeenCalledWith("first", "second");
  });

  it("submits a server link and opens the local library list", async () => {
    const onSubmitLink = vi.fn();
    const onToggleLocal = vi.fn();
    mounted = mountStrip({
      items: [],
      onSubmitLink,
      onToggleLocal,
    });
    await nextTick();

    const { t } = useLocale();
    expect(mounted.host.textContent).toContain(t("llm.wizard.gallery.favorite.empty"));
    const favorites = mounted.host.querySelector("[data-testid='wizard-favorites']");
    const heading = favorites?.querySelector("h2");
    expect(heading?.textContent).toContain(t("llm.wizard.gallery.favorite.heading"));

    const input = mounted.host.querySelector<HTMLInputElement>("[data-testid='wizard-favorite-link']");
    expect(input).not.toBeNull();
    input!.value = "https://code2graph.ru/ivan/plan";
    input!.dispatchEvent(new Event("input"));
    mounted.host.querySelector<HTMLButtonElement>("[data-testid='wizard-favorite-add-link']")?.click();
    expect(onSubmitLink).toHaveBeenCalledTimes(1);

    mounted.host.querySelector<HTMLButtonElement>("[data-testid='wizard-favorite-local-toggle']")?.click();
    expect(onToggleLocal).toHaveBeenCalledTimes(1);
  });
});
