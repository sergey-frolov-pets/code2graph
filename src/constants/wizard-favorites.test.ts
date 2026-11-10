import { describe, expect, it, vi } from "vitest";
import { MAX_PUML_FILE_BYTES } from "@/constants/diagram-library";
import {
  isWizardFavoriteSourceTooLarge,
  moveWizardFavorite,
  parseWizardFavorites,
  parseWizardServerLibraryLink,
  readWizardFavorites,
  removeWizardFavoriteByIdentity,
  upsertWizardFavorite,
  wizardFavoriteIdentity,
  writeWizardFavorites,
  WIZARD_FAVORITES_STORAGE_KEY,
  type WizardFavoriteEntry,
} from "@/constants/wizard-favorites";

function entry(id: string, exampleId: string): WizardFavoriteEntry {
  return {
    id,
    ref: { kind: "example", exampleId },
    title: exampleId,
    format: "mermaid",
    source: "",
  };
}

describe("wizard favorites", () => {
  it("keeps the first copy of a repeated diagram and skips broken rows", () => {
    const parsed = parseWizardFavorites([
      entry("one", "waterfall"),
      { ...entry("two", "waterfall"), id: "duplicate" },
      { id: "", ref: { kind: "example", exampleId: "x" }, title: "x", format: "mermaid", source: "" },
      { id: "bad", ref: { kind: "server-link", username: "ivan", slug: "Bad Slug" }, title: "x", format: "mermaid", source: "" },
      {
        id: "local",
        ref: { kind: "local", diagramId: "diagram-1" },
        title: "  Plan  ",
        format: "plantuml",
        source: "@startuml\n@enduml",
      },
    ]);

    expect(parsed).toEqual([
      entry("one", "waterfall"),
      {
        id: "local",
        ref: { kind: "local", diagramId: "diagram-1" },
        title: "Plan",
        format: "plantuml",
        source: "@startuml\n@enduml",
      },
    ]);
  });

  it("rejects a value that is not a list", () => {
    expect(parseWizardFavorites({ items: [] })).toBeNull();
  });

  it("updates a diagram in place and appends a new one", () => {
    const first = entry("one", "waterfall");
    const updated = upsertWizardFavorite([first], {
      ...entry("other", "waterfall"),
      title: "Waterfall",
    });
    expect(updated).toEqual([{ ...first, title: "Waterfall" }]);

    const added = upsertWizardFavorite(updated, entry("two", "radar"));
    expect(added.map((item) => item.id)).toEqual(["one", "two"]);
  });

  it("removes by identity and moves an item to another index", () => {
    const items = [entry("a", "one"), entry("b", "two"), entry("c", "three")];
    expect(removeWizardFavoriteByIdentity(items, wizardFavoriteIdentity(items[1]!.ref)).map((item) => item.id)).toEqual(["a", "c"]);

    expect(moveWizardFavorite(items, "a", 1).map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moveWizardFavorite(items, "c", 0).map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(moveWizardFavorite(items, "b", 1)).toBe(items);
    expect(moveWizardFavorite(items, "missing", 0)).toBe(items);
  });

  it("reads a server library link from a url, a path, and a pages query", () => {
    expect(parseWizardServerLibraryLink("https://www.code2graph.ru/ivan/plan")).toEqual({
      username: "ivan",
      slug: "plan",
    });
    expect(parseWizardServerLibraryLink("ivan/water-fall")).toEqual({
      username: "ivan",
      slug: "water-fall",
    });
    expect(parseWizardServerLibraryLink("https://user.github.io/repo/?/anna/roadmap")).toEqual({
      username: "anna",
      slug: "roadmap",
    });
    expect(parseWizardServerLibraryLink("https://code2graph.ru/%D0%98%D0%B2%D0%B0%D0%BD/plan")).toEqual({
      username: "Иван",
      slug: "plan",
    });
  });

  it("ignores local data links, reserved paths, and empty text", () => {
    expect(parseWizardServerLibraryLink("https://code2graph.ru/local/plan")).toBeNull();
    expect(parseWizardServerLibraryLink("https://code2graph.ru/api/diagrams")).toBeNull();
    expect(parseWizardServerLibraryLink("   ")).toBeNull();
    expect(parseWizardServerLibraryLink("not a link with spaces")).toBeNull();
  });

  it("round-trips the saved order", () => {
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    });

    const items = [entry("a", "one"), entry("b", "two")];
    expect(writeWizardFavorites(items)).toBe(true);
    expect(memory.get(WIZARD_FAVORITES_STORAGE_KEY)).toContain("\"id\":\"a\"");
    expect(readWizardFavorites()).toEqual(items);
    expect(isWizardFavoriteSourceTooLarge("a".repeat(MAX_PUML_FILE_BYTES))).toBe(false);
    expect(isWizardFavoriteSourceTooLarge("a".repeat(MAX_PUML_FILE_BYTES + 1))).toBe(true);
  });
});
