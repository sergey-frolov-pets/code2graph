// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WizardExampleGallery from "@/components/wizard/WizardExampleGallery.vue";
import { listDiagramExamples } from "@/constants/diagram-example-catalog";
import { diagramExampleTitle } from "@/constants/diagram-example-text";
import { LAYOUT_ENGINES } from "@/constants";
import { RENDER_MODES } from "@/constants/render-settings";
import { reloadWizardFavorites } from "@/composables/wizard/useWizardFavorites";
import { useLocale } from "@/composables/useLocale";

function mountGallery() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      return () =>
        h(WizardExampleGallery, {
          layout: LAYOUT_ENGINES.smetana,
          renderMode: RENDER_MODES.offline,
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

describe("WizardExampleGallery favorites", () => {
  let mounted: ReturnType<typeof mountGallery> | null = null;

  beforeEach(() => {
    localStorage.clear();
    reloadWizardFavorites();
  });

  afterEach(() => {
    mounted?.unmount();
    mounted = null;
    document.body.innerHTML = "";
    localStorage.clear();
    reloadWizardFavorites();
  });

  it("shows favorites before tags and toggles an example into that list", async () => {
    mounted = mountGallery();
    await nextTick();

    const favorites = mounted.host.querySelector("[data-testid='wizard-favorites']");
    const tags = mounted.host.querySelector("[data-testid='wizard-tag-section']");
    expect(favorites).not.toBeNull();
    expect(tags).not.toBeNull();
    expect(
      favorites!.compareDocumentPosition(tags!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const example = listDiagramExamples()[0];
    expect(example).toBeDefined();
    const { t } = useLocale();
    const title = diagramExampleTitle(example!, t);
    const thumb = mounted.host.querySelector<HTMLButtonElement>(
      "[data-testid='wizard-example-favorite-thumb']",
    );
    expect(thumb?.getAttribute("aria-pressed")).toBe("false");
    thumb?.click();
    await nextTick();

    const open = mounted.host.querySelector<HTMLButtonElement>(
      "[data-testid='wizard-favorite-open']",
    );
    expect(open?.getAttribute("aria-label")).toContain(title);
    expect(thumb?.getAttribute("aria-pressed")).toBe("true");

    thumb?.click();
    await nextTick();
    expect(mounted.host.querySelector("[data-testid='wizard-favorite-open']")).toBeNull();
    expect(thumb?.getAttribute("aria-pressed")).toBe("false");

    const input = mounted.host.querySelector<HTMLInputElement>(
      "[data-testid='wizard-favorite-link']",
    );
    expect(input).not.toBeNull();
    input!.value = "not a link";
    input!.dispatchEvent(new Event("input", { bubbles: true }));
    input!.form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await nextTick();
    const linkError = mounted.host.querySelector("[data-testid='wizard-favorite-link-error']");
    expect(linkError?.textContent).toContain(t("llm.wizard.gallery.favorite.linkInvalid"));
  });
});
