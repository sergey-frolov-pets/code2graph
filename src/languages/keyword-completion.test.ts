import { describe, expect, it } from "vitest";
import {
  completeLanguageKeywords,
  extractKeywordPrefix,
  languageKeywords,
} from "@/languages/keyword-completion";
import { MAX_COMPLETION_ITEMS } from "@/utils/completion-types";

describe("completeLanguageKeywords", () => {
  const catalog = languageKeywords(
    ["direction", "shape", "diamond"],
    { insertSuffix: ": " },
  );

  it("matches keywords case-insensitively and keeps catalog spelling", () => {
    const prefix = extractKeywordPrefix("  Dir", 5);
    const items = completeLanguageKeywords(catalog, {
      lines: ["  Dir"],
      lineNumber: 1,
      column: 5,
      prefix: prefix.prefix,
      prefixInfo: prefix,
    });

    expect(prefix.prefix).toBe("Dir");
    expect(items.map((item) => item.label)).toEqual(["direction"]);
    expect(items[0]?.insertText).toBe("direction: ");
    expect(items[0]?.kind).toBe("keyword");
    expect(items[0]?.detailKey).toBe("editor.completion.keyword");
  });

  it("reads a keyword after an opening tag", () => {
    const prefix = extractKeywordPrefix("<nod", 4);
    expect(prefix).toEqual({
      prefix: "nod",
      replaceStart: 1,
      mode: "word",
    });
  });

  it("stays closed until two characters are typed", () => {
    const prefix = extractKeywordPrefix("d", 1);
    expect(
      completeLanguageKeywords(catalog, {
        lines: ["d"],
        lineNumber: 1,
        column: 1,
        prefix: prefix.prefix,
        prefixInfo: prefix,
      }),
    ).toEqual([]);
  });

  it("caps the list and skips duplicate labels", () => {
    const labels = Array.from({ length: MAX_COMPLETION_ITEMS + 5 }, (_, index) => {
      return `kw${index.toString().padStart(2, "0")}`;
    });
    const items = completeLanguageKeywords(
      languageKeywords([...labels, labels[0] ?? "kw00"]),
      {
        lines: ["kw"],
        lineNumber: 1,
        column: 2,
        prefix: "kw",
        prefixInfo: { prefix: "kw", replaceStart: 0, mode: "word" },
      },
    );

    expect(items).toHaveLength(MAX_COMPLETION_ITEMS);
    expect(new Set(items.map((item) => item.label)).size).toBe(items.length);
  });
});
