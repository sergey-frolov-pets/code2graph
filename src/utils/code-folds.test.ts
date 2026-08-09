import { describe, expect, it } from "vitest";
import {
  buildDisplayText,
  canAddBookmark,
  canAddFold,
  canAddRegion,
  createFoldId,
  getHiddenSourceLines,
  hasRegionStartingAtLine,
  isBookmark,
  mapDisplayOffsetToSourceOffset,
  mapSourceOffsetToDisplayOffset,
  mergeDisplayTextIntoSource,
  normalizeLineRange,
  parseLineNumberInput,
  rangesNestOrSeparate,
  sortRegions,
  type CodeFoldRegion,
} from "@/utils/code-folds";

function makeFold(
  startLine: number,
  endLine: number,
  collapsed = true,
): CodeFoldRegion {
  return {
    id: createFoldId(),
    startLine,
    endLine,
    collapsed,
  };
}

describe("rangesNestOrSeparate", () => {
  it("returns true for non-intersecting ranges", () => {
    expect(rangesNestOrSeparate({ startLine: 1, endLine: 3 }, { startLine: 5, endLine: 7 })).toBe(
      true,
    );
  });

  it("returns true when one range contains another", () => {
    expect(rangesNestOrSeparate({ startLine: 1, endLine: 10 }, { startLine: 3, endLine: 5 })).toBe(
      true,
    );
  });

  it("returns false for partial overlap", () => {
    expect(rangesNestOrSeparate({ startLine: 1, endLine: 5 }, { startLine: 4, endLine: 8 })).toBe(
      false,
    );
  });
});

describe("canAddFold", () => {
  it("rejects invalid line ranges", () => {
    expect(canAddFold([], 0, 2)).toBe(false);
    expect(canAddFold([], 3, 3)).toBe(false);
    expect(canAddFold([], 5, 2)).toBe(false);
  });

  it("allows nested folds", () => {
    const folds = [makeFold(2, 8)];
    expect(canAddFold(folds, 3, 5)).toBe(true);
  });

  it("rejects partially overlapping folds", () => {
    const folds = [makeFold(2, 6)];
    expect(canAddFold(folds, 5, 9)).toBe(false);
  });
});

describe("buildDisplayText", () => {
  it("hides collapsed inner lines behind a placeholder", () => {
    const sourceLines = ["line 1", "line 2", "line 3", "line 4"];
    const folds = [makeFold(2, 3)];

    const display = buildDisplayText(sourceLines, folds);

    expect(display).toContain("line 1");
    expect(display).toContain("line 2");
    expect(display).not.toContain("line 3");
    expect(display).toContain("line 4");
    expect(display).toMatch(/\u22EF 1/);
  });
});

describe("mergeDisplayTextIntoSource", () => {
  it("applies edits from display text back to source", () => {
    const previousSource = "alpha\nbeta\ngamma\ndelta";
    const folds = [makeFold(2, 3)];
    const display = buildDisplayText(previousSource.split("\n"), folds);
    const editedDisplay = display.replace("beta", "BETA");

    const merged = mergeDisplayTextIntoSource(
      editedDisplay,
      previousSource,
      folds,
    );

    expect(merged).toBe("alpha\nBETA\ngamma\ndelta");
  });
});

describe("offset mapping with folds", () => {
  it("maps display offsets to source offsets", () => {
    const source = "one\ntwo\nthree\nfour";
    const folds = [makeFold(2, 3)];
    const display = buildDisplayText(source.split("\n"), folds);
    const sourceOffset = mapDisplayOffsetToSourceOffset(
      display.indexOf("four"),
      source,
      folds,
    );

    expect(source.charAt(sourceOffset)).toBe("f");
  });

  it("maps source offsets to display offsets", () => {
    const source = "one\ntwo\nthree\nfour";
    const folds = [makeFold(2, 3)];
    const sourceOffset = source.indexOf("four");
    const displayOffset = mapSourceOffsetToDisplayOffset(
      sourceOffset,
      source,
      folds,
    );
    const display = buildDisplayText(source.split("\n"), folds);

    expect(display.charAt(displayOffset)).toBe("f");
  });
});

describe("getHiddenSourceLines", () => {
  it("marks only inner lines of collapsed folds as hidden", () => {
    const folds = [makeFold(2, 4)];
    const hidden = getHiddenSourceLines(folds);

    expect(hidden.has(2)).toBe(false);
    expect(hidden.has(3)).toBe(true);
    expect(hidden.has(4)).toBe(true);
  });

  it("ignores bookmarks", () => {
    const folds = [makeFold(5, 5)];
    const hidden = getHiddenSourceLines(folds);

    expect(hidden.size).toBe(0);
  });
});

describe("bookmarks and regions", () => {
  it("detects bookmarks by equal start and end lines", () => {
    expect(isBookmark({ startLine: 4, endLine: 4 })).toBe(true);
    expect(isBookmark({ startLine: 2, endLine: 5 })).toBe(false);
  });

  it("normalizes swapped line ranges", () => {
    expect(normalizeLineRange(8, 3)).toEqual({ startLine: 3, endLine: 8 });
    expect(normalizeLineRange(2, 6)).toEqual({ startLine: 2, endLine: 6 });
  });

  it("parses line number input", () => {
    expect(parseLineNumberInput(" 12 ")).toBe(12);
    expect(parseLineNumberInput("0")).toBeNull();
    expect(parseLineNumberInput("x")).toBeNull();
  });

  it("allows bookmarks only once per line", () => {
    const folds: CodeFoldRegion[] = [
      { id: "b1", startLine: 3, endLine: 3, collapsed: false },
    ];

    expect(canAddBookmark(folds, 3, 10)).toBe(false);
    expect(canAddBookmark(folds, 4, 10)).toBe(true);
  });

  it("rejects a bookmark when another interval starts on the same line", () => {
    const folds: CodeFoldRegion[] = [
      { id: "f1", startLine: 3, endLine: 8, collapsed: true },
    ];

    expect(hasRegionStartingAtLine(folds, 3)).toBe(true);
    expect(canAddBookmark(folds, 3, 10)).toBe(false);
    expect(canAddRegion(folds, 3, null, 10)).toBe(false);
  });

  it("rejects two intervals that start on the same line", () => {
    const folds: CodeFoldRegion[] = [
      { id: "f1", startLine: 2, endLine: 10, collapsed: true },
    ];

    expect(canAddRegion(folds, 2, 5, 12)).toBe(false);
    expect(canAddRegion(folds, 5, 8, 12)).toBe(true);
  });

  it("validates region creation for bookmark and fold", () => {
    expect(canAddRegion([], 5, null, 10)).toBe(true);
    expect(canAddRegion([], 2, 7, 10)).toBe(true);
    expect(canAddRegion([], 2, 2, 10)).toBe(true);
    expect(canAddRegion([], 11, null, 10)).toBe(false);
  });

  it("sorts regions by start and end lines", () => {
    const regions: CodeFoldRegion[] = [
      { id: "a", startLine: 8, endLine: 10, collapsed: true },
      { id: "b", startLine: 2, endLine: 2, collapsed: false },
      { id: "c", startLine: 2, endLine: 5, collapsed: true },
    ];

    expect(sortRegions(regions).map((region) => region.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });
});
