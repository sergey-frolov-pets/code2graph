import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY_DIAGRAM_FORMAT,
  STORAGE_KEY_FILE_NAME,
} from "@/constants";

vi.mock("@/composables/useAppDialog", () => ({
  useAppDialog: () => ({
    prompt: vi.fn(),
  }),
}));

vi.mock("@/composables/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

import { useDiagramDocument } from "@/composables/useDiagramDocument";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
});

describe("useDiagramDocument", () => {
  it("restores persisted format and filename on re-entry", () => {
    storage.set(STORAGE_KEY_DIAGRAM_FORMAT, "mermaid");
    storage.set(STORAGE_KEY_FILE_NAME, "diagram.mmd");
    storage.set(
      "plantuml-smetana-source",
      "info\n  title without mermaid markers",
    );

    const source = ref("");
    const diagramFormat = ref<"plantuml" | "mermaid" | "graphml">("plantuml");

    const { restoreDocumentMetadata, prepareRestoredSource, loadedFileName } =
      useDiagramDocument({
        source,
        diagramFormat,
        error: ref(""),
        syntaxErrorLines: ref<number[]>([]),
        persistSettings: vi.fn(),
        scheduleRender: vi.fn(),
        clearHistory: vi.fn(),
      });

    restoreDocumentMetadata();
    source.value = storage.get("plantuml-smetana-source") ?? "";
    prepareRestoredSource();

    expect(diagramFormat.value).toBe("mermaid");
    expect(loadedFileName.value).toBe("diagram.mmd");
  });

  it("does not downgrade mermaid to plantuml when source has no markers", async () => {
    const source = ref("plain text without diagram markers");
    const diagramFormat = ref<"plantuml" | "mermaid" | "graphml">("mermaid");

    useDiagramDocument({
      source,
      diagramFormat,
      error: ref(""),
      syntaxErrorLines: ref<number[]>([]),
      persistSettings: vi.fn(),
      scheduleRender: vi.fn(),
      clearHistory: vi.fn(),
    });

    source.value = "updated text still without markers";
    await nextTick();

    expect(diagramFormat.value).toBe("mermaid");
  });

  it("switches format when explicit source markers appear", async () => {
    const source = ref("info\n  title without markers");
    const diagramFormat = ref<"plantuml" | "mermaid" | "graphml">("plantuml");

    const { loadedFileName } = useDiagramDocument({
      source,
      diagramFormat,
      error: ref(""),
      syntaxErrorLines: ref<number[]>([]),
      persistSettings: vi.fn(),
      scheduleRender: vi.fn(),
      clearHistory: vi.fn(),
    });

    source.value = "flowchart TD\nA --> B";
    await nextTick();

    expect(diagramFormat.value).toBe("mermaid");
    expect(loadedFileName.value).toBe("diagram.mmd");
  });
});
