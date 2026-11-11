import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY_LOCALE } from "@/constants/i18n";
import { STORAGE_KEY_EDITOR_FONT_SIZE } from "@/constants/editor-settings";
import { STORAGE_KEY_LLM_API_KEYS } from "@/constants/llm-settings";
import { BUILTIN_SNIPPETS } from "@/constants/builtin-snippets";
import type { DiagramDto } from "@/constants/diagram-library";
import type { CustomSnippet } from "@/types/snippets";
import { STORAGE_KEY_CUSTOM_SNIPPETS } from "@/storage/snippets";

vi.mock("@/storage/diagram-store", () => ({
  loadSectionsFromCache: vi.fn(async () => []),
  loadAllDiagramDetailsFromCache: vi.fn(async () => []),
}));

import {
  AppBackupFormatError,
  applyBackupSettings,
  buildAppBackup,
  collectBackupSettings,
  diffBackupDiagrams,
  diffBackupSnippets,
  parseAppBackup,
} from "@/utils/app-backup";

const storage = new Map<string, string>();

const personalSnippet: CustomSnippet = {
  id: "custom-alt",
  language: "plantuml",
  title: "Альтернатива",
  content: "alt успех\nend",
  categoryId: "custom",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function diagram(id: string, source: string, title = id): DiagramDto {
  return {
    id,
    sectionId: null,
    title,
    description: "",
    tags: ["local"],
    language: "plantuml",
    source,
    fileName: `${id}.puml`,
    byteSize: source.length,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function snippet(id: string, content: string): CustomSnippet {
  return {
    ...personalSnippet,
    id,
    title: id,
    content,
  };
}

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

describe("app backup file", () => {
  it("saves personal snippets and settings without LLM keys or built-in snippets", async () => {
    storage.set(STORAGE_KEY_LOCALE, "ru");
    storage.set(STORAGE_KEY_LLM_API_KEYS, "secret-key");
    storage.set(STORAGE_KEY_CUSTOM_SNIPPETS, JSON.stringify([personalSnippet]));

    const backup = await buildAppBackup();

    expect(BUILTIN_SNIPPETS.length).toBeGreaterThan(0);
    expect(backup.snippets.map((item) => item.id)).toEqual(["custom-alt"]);
    expect(backup.settings[STORAGE_KEY_LOCALE]).toBe("ru");
    expect(backup.settings).not.toHaveProperty(STORAGE_KEY_LLM_API_KEYS);
    expect(collectBackupSettings()).not.toHaveProperty(STORAGE_KEY_LLM_API_KEYS);
  });

  it("drops an LLM key planted in the file and rejects a library export", () => {
    const parsed = parseAppBackup(
      JSON.stringify({
        kind: "code2graph-backup",
        version: 1,
        exportedAt: "2026-03-01T00:00:00.000Z",
        library: { sections: [], diagrams: [] },
        snippets: [],
        settings: {
          [STORAGE_KEY_LLM_API_KEYS]: "secret-key",
          [STORAGE_KEY_LOCALE]: "de",
        },
      }),
    );

    expect(parsed.settings).toEqual({ [STORAGE_KEY_LOCALE]: "de" });
    expect(parsed.settings).not.toHaveProperty(STORAGE_KEY_LLM_API_KEYS);

    expect(() =>
      parseAppBackup(
        JSON.stringify({
          version: 1,
          exportedAt: "2026-03-01T00:00:00.000Z",
          sections: [],
          diagrams: [],
        }),
      ),
    ).toThrow(AppBackupFormatError);
  });

  it("lists only new and changed diagrams and snippets from the file", () => {
    const localDiagram = diagram("same", "@startuml\nA -> B\n@enduml", "Same");
    const changedLocal = diagram("changed", "old source", "Changed");
    const fileChanged = diagram("changed", "new source", "Changed");
    const fileNew = diagram("from-file", "@startuml\n@enduml", "From file");

    expect(
      diffBackupDiagrams(
        [localDiagram, changedLocal, diagram("local-only", "stay")],
        [localDiagram, fileChanged, fileNew],
      ).map((diff) => [diff.kind, diff.diagram.id]),
    ).toEqual([
      ["changed", "changed"],
      ["new", "from-file"],
    ]);

    const sameSnippet = snippet("same-snippet", "alt\nend");
    expect(
      diffBackupSnippets(
        [sameSnippet, snippet("edited", "old"), snippet("local-snippet", "stay")],
        [sameSnippet, snippet("edited", "new"), snippet("file-snippet", "alt\nend")],
      ).map((diff) => [diff.kind, diff.snippet.id]),
    ).toEqual([
      ["changed", "edited"],
      ["new", "file-snippet"],
    ]);
  });

  it("replaces allowlisted settings and leaves the LLM key untouched", () => {
    storage.set(STORAGE_KEY_LLM_API_KEYS, "secret-key");
    storage.set(STORAGE_KEY_LOCALE, "en");
    storage.set(STORAGE_KEY_EDITOR_FONT_SIZE, "16");

    applyBackupSettings({
      [STORAGE_KEY_LOCALE]: "ru",
      [STORAGE_KEY_LLM_API_KEYS]: "from-file",
    });

    expect(storage.get(STORAGE_KEY_LLM_API_KEYS)).toBe("secret-key");
    expect(storage.get(STORAGE_KEY_LOCALE)).toBe("ru");
    expect(storage.has(STORAGE_KEY_EDITOR_FONT_SIZE)).toBe(false);
  });
});
