// @vitest-environment jsdom

import { createApp, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DIAGRAM_FORMATS } from "@/constants/diagram-format-ids";

vi.mock("@/components/site/language-diagram-thumb", () => ({
  renderLanguageDiagramThumb: () => Promise.resolve(""),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const { bindAppRouterListeners } = await import("@/composables/useAppRouter");
const { useLocale } = await import("@/composables/useLocale");
const { default: LandingPage } = await import("@/pages/LandingPage.vue");
const { default: LanguagePage } = await import("@/pages/LanguagePage.vue");

const LINKS_PER_LANGUAGE_ON_LANDING = 6;

function languageLinkCounts(): Record<string, number> {
  const counts = Object.fromEntries(DIAGRAM_FORMATS.map((id) => [id, 0]));
  for (const anchor of document.querySelectorAll("a[href^='#/lang/']")) {
    const id = anchor.getAttribute("href")?.slice("#/lang/".length) ?? "";
    if (id in counts) {
      counts[id] += 1;
    }
  }
  return counts;
}

function mount(component: object) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(component);
  app.mount(host);
  return {
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("public language pages", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.location.hash = "#/";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

  it("links every language page from the landing", async () => {
    useLocale().setLocale("en");
    const view = mount(LandingPage);
    await nextTick();

    expect(document.getElementById("languages-title")?.textContent).toContain("Languages");
    expect(languageLinkCounts()).toEqual(
      Object.fromEntries(
        DIAGRAM_FORMATS.map((id) => [id, LINKS_PER_LANGUAGE_ON_LANDING]),
      ),
    );
    expect(document.body.textContent).toContain(
      "Lightweight diagrams for GitHub, Notion, Obsidian, and Jira",
    );
    view.unmount();
  });

  it("renders a language page from its hash", async () => {
    useLocale().setLocale("en");
    window.location.hash = "#/lang/mermaid";
    bindAppRouterListeners();
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    const view = mount(LanguagePage);
    await nextTick();

    expect(document.querySelector(".language-page h1")?.textContent).toBe("Mermaid");
    expect(
      document.querySelector("a[href='#/lang/mermaid'][aria-current='page']"),
    ).not.toBeNull();
    expect(languageLinkCounts().plantuml).toBeGreaterThan(0);
    view.unmount();
  });
});
