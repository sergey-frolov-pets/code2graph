import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiagramDto, SectionDto } from "@/constants/diagram-library";
import {
  LIBRARY_STORE_DATA_LINKS,
  LIBRARY_STORE_DIAGRAM_DETAILS,
  LIBRARY_STORE_DIAGRAMS,
  LIBRARY_STORE_SECTIONS,
} from "@/storage/library/library-db";

const idb = vi.hoisted(() => {
  const memory = new Map<string, Map<string, unknown>>();

  function bucket(name: string): Map<string, unknown> {
    let rows = memory.get(name);
    if (!rows) {
      rows = new Map();
      memory.set(name, rows);
    }
    return rows;
  }

  return { memory, bucket };
});

vi.mock("@/storage/idb/idb-core", () => ({
  getAllFromObjectStore: async (store: { readAll: () => unknown[] }) => store.readAll(),
  getFromObjectStore: async () => null,
  runIndexedTransaction: async (
    _dbName: string,
    _dbVersion: number,
    _onUpgrade: unknown,
    storeNames: string | string[],
    _mode: string,
    callback: (stores: Record<string, {
      readAll: () => unknown[];
      clear: () => void;
      put: (value: { id?: string; diagramId?: string }) => void;
      delete: (key: string) => void;
    }>) => unknown,
  ) => {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const stores: Record<string, {
      readAll: () => unknown[];
      clear: () => void;
      put: (value: { id?: string; diagramId?: string }) => void;
      delete: (key: string) => void;
    }> = {};
    for (const name of names) {
      const rows = idb.bucket(name);
      stores[name] = {
        readAll: () => [...rows.values()],
        clear: () => rows.clear(),
        put: (value) => {
          const key = value.id ?? value.diagramId;
          if (!key) {
            throw new Error("missing key");
          }
          rows.set(key, structuredClone(value));
        },
        delete: (key) => {
          rows.delete(key);
        },
      };
    }
    return callback(stores);
  },
}));

import { copyBackupDiagrams, replaceLocalLibrary } from "@/storage/diagram-store";

function diagram(id: string, source: string, sectionId: string | null = null): DiagramDto {
  return {
    id,
    sectionId,
    title: id,
    description: "",
    tags: [],
    language: "plantuml",
    source,
    fileName: `${id}.puml`,
    byteSize: source.length,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function section(id: string, title: string, parentId: string | null = null): SectionDto {
  return {
    id,
    parentId,
    title,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

beforeEach(() => {
  idb.memory.clear();
});

describe("replaceLocalLibrary", () => {
  it("removes a local diagram missing from the file and writes the file diagrams", async () => {
    idb.bucket(LIBRARY_STORE_DIAGRAMS).set("old-diagram", { id: "old-diagram" });
    idb.bucket(LIBRARY_STORE_DIAGRAMS).set("kept-diagram", { id: "kept-diagram" });
    idb.bucket(LIBRARY_STORE_DATA_LINKS).set("old-diagram", { diagramId: "old-diagram" });
    idb.bucket(LIBRARY_STORE_DATA_LINKS).set("kept-diagram", { diagramId: "kept-diagram" });

    await replaceLocalLibrary(
      [section("root", "Root")],
      [diagram("kept-diagram", "updated source", "root"), diagram("new-diagram", "@startuml\n@enduml")],
    );

    const diagrams = idb.bucket(LIBRARY_STORE_DIAGRAMS);
    const details = idb.bucket(LIBRARY_STORE_DIAGRAM_DETAILS);
    const links = idb.bucket(LIBRARY_STORE_DATA_LINKS);

    expect([...diagrams.keys()].sort()).toEqual(["kept-diagram", "new-diagram"]);
    expect(details.has("old-diagram")).toBe(false);
    expect((details.get("kept-diagram") as DiagramDto).source).toBe("updated source");
    expect((details.get("new-diagram") as DiagramDto).source).toBe("@startuml\n@enduml");
    expect(links.has("old-diagram")).toBe(false);
    expect(links.has("kept-diagram")).toBe(true);
  });
});

describe("copyBackupDiagrams", () => {
  it("adds a missing section chain without rewriting an existing section title", async () => {
    idb.bucket(LIBRARY_STORE_SECTIONS).set("root", section("root", "Local root"));

    await copyBackupDiagrams(
      [section("root", "File root"), section("child", "Child", "root")],
      [diagram("copied", "@startuml\nAlice -> Bob\n@enduml", "child")],
      new Set(["copied"]),
    );

    const sections = idb.bucket(LIBRARY_STORE_SECTIONS);
    const details = idb.bucket(LIBRARY_STORE_DIAGRAM_DETAILS);

    expect((sections.get("root") as SectionDto).title).toBe("Local root");
    expect((sections.get("child") as SectionDto).parentId).toBe("root");
    expect((details.get("copied") as DiagramDto).sectionId).toBe("child");
  });
});
