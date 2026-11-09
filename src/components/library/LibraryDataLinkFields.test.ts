// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

const prompt = vi.hoisted(() => vi.fn(async () => null as string | null));

vi.mock("@/composables/useAppDialog", () => ({
  useAppDialog: () => ({ prompt }),
}));
import { setLibraryTarget } from "@/config/library-target";
import { useLocale } from "@/composables/useLocale";
import { DATA_LINK_EXAMPLE_URL } from "@/services/local-data-link/constants";
import { diagramDataLinkUrl } from "@/router";

vi.mock("@/storage/local-data-links", async () => {
  const actual = await vi.importActual<typeof import("@/storage/local-data-links")>(
    "@/storage/local-data-links",
  );
  return {
    ...actual,
    getLocalDataLink: vi.fn(async () => null),
    findLocalDataLinkBySlug: vi.fn(async () => null),
  };
});

const { default: LibraryDataLinkFields } = await import(
  "@/components/library/LibraryDataLinkFields.vue"
);

function mountFields() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      return () => h(LibraryDataLinkFields, { diagramId: "diagram-1" });
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

async function flushSlugCheck(): Promise<void> {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

describe("local data link address hint", () => {
  let mounted: ReturnType<typeof mountFields> | null = null;

  afterEach(async () => {
    mounted?.unmount();
    mounted = null;
    document.body.innerHTML = "";
    const storage = await import("@/storage/local-data-links");
    vi.mocked(storage.getLocalDataLink).mockResolvedValue(null);
    vi.mocked(storage.findLocalDataLinkBySlug).mockResolvedValue(null);
    prompt.mockReset();
    prompt.mockResolvedValue(null);
  });

  it("shows a plain example URL, then a live link for the typed name", async () => {
    useLocale().setLocale("ru");
    setLibraryTarget("local");
    mounted = mountFields();
    await flushSlugCheck();

    const address = mounted.host.querySelector(
      '[data-testid="library-data-link-address"]',
    );
    const example = address?.querySelector(
      '[data-testid="library-data-link-example"]',
    );
    expect(example?.tagName).toBe("SPAN");
    expect(example?.textContent).toBe(DATA_LINK_EXAMPLE_URL);
    expect(example?.closest("a")).toBeNull();
    expect(DATA_LINK_EXAMPLE_URL).toBe("https://www.code2graph.ru/local/example");
    expect(address?.textContent).toContain("Открывайте");
    expect(address?.textContent).toContain("ЛОКАЛЬНО");
    expect(address?.textContent).not.toContain("где g");
    expect(address?.querySelector("a")).toBeNull();

    const slugInput = mounted.host.querySelector<HTMLInputElement>(
      '[data-testid="library-data-link-slug"]',
    );
    expect(slugInput).not.toBeNull();
    slugInput!.value = "Waterfall";
    slugInput!.dispatchEvent(new Event("input", { bubbles: true }));
    await flushSlugCheck();

    const live = address?.querySelector<HTMLAnchorElement>(
      '[data-testid="library-data-link-live"]',
    );
    const liveUrl = diagramDataLinkUrl(window.location.origin, "waterfall");
    expect(live?.textContent).toBe(liveUrl);
    expect(live?.getAttribute("href")).toBe(liveUrl);
    expect(address?.textContent).toContain(liveUrl);
    expect(address?.textContent).not.toContain(DATA_LINK_EXAMPLE_URL);
    expect(address?.textContent?.split(liveUrl)).toHaveLength(2);
    expect(
      mounted.host.querySelector('[data-testid="library-data-link-inactive"]'),
    ).not.toBeNull();
    expect(mounted.host.textContent).toContain("Неактивна");
  });

  it("keeps an inactive link inactive when the name is taken and rename is cancelled", async () => {
    const storage = await import("@/storage/local-data-links");
    vi.mocked(storage.getLocalDataLink).mockResolvedValue({
      diagramId: "diagram-1",
      slug: "waterfall",
      filePathLabel: "C:\\data\\waterfall.xlsx",
      sheetRange: "A1:B2",
      untilEmptyRow: false,
      fileName: "waterfall.xlsx",
      fileHandle: null,
      inactive: true,
    });
    vi.mocked(storage.findLocalDataLinkBySlug).mockResolvedValue({
      diagramId: "other-diagram",
      slug: "waterfall",
      filePathLabel: "",
      sheetRange: "A1:B2",
      untilEmptyRow: false,
      fileName: "",
      fileHandle: null,
      inactive: false,
    });
    prompt.mockClear();

    useLocale().setLocale("ru");
    setLibraryTarget("local");
    mounted = mountFields();
    await flushSlugCheck();

    const checkbox = mounted.host.querySelector<HTMLInputElement>(
      '[data-testid="library-data-link-inactive"]',
    );
    expect(checkbox?.checked).toBe(true);
    checkbox!.checked = false;
    checkbox!.dispatchEvent(new Event("change", { bubbles: true }));
    await flushSlugCheck();

    expect(prompt).toHaveBeenCalled();
    expect(checkbox?.checked).toBe(true);
  });
});
