import { describe, expect, it } from "vitest";
import type { CodeFoldRegion } from "@/utils/code-folds";
import {
  anchorHiddenInsert,
  applySessionViewEdit,
  buildSessionProjection,
  buildViewFolds,
  diffSessionHunks,
  mapViewOffsetToWorkingOffset,
  sessionPreviewText,
  sessionViewText,
  splitSourceLines,
} from "@/services/editor/session-changes";

function hunkKinds(baseline: string, current: string): string[] {
  return diffSessionHunks(splitSourceLines(baseline), splitSourceLines(current)).map(
    (hunk) => hunk.kind,
  );
}

describe("diffSessionHunks", () => {
  it("returns no hunks for identical text", () => {
    expect(hunkKinds("a\nb\nc", "a\nb\nc")).toEqual([]);
  });

  it("keeps separate changes that are not adjacent", () => {
    const hunks = diffSessionHunks(
      splitSourceLines("a\nb\nc\nd"),
      splitSourceLines("a\nB\nc\nD"),
    );

    expect(hunks.map((hunk) => hunk.kind)).toEqual(["modify", "modify"]);
    expect(hunks.map((hunk) => hunk.currentStart)).toEqual([2, 4]);
  });

  it("merges an adjacent deletion and insertion into one modify hunk", () => {
    const hunks = diffSessionHunks(
      splitSourceLines("a\nb\nc"),
      splitSourceLines("a\nB\nc"),
    );

    expect(hunks).toHaveLength(1);
    expect(hunks[0]).toMatchObject({
      kind: "modify",
      baselineStart: 2,
      baselineCount: 1,
      currentStart: 2,
      currentCount: 1,
    });
  });

  it("describes a middle insertion and a middle deletion", () => {
    expect(hunkKinds("a\nc", "a\nb\nc")).toEqual(["insert"]);
    expect(hunkKinds("a\nb\nc", "a\nc")).toEqual(["delete"]);
  });
});

describe("buildSessionProjection", () => {
  const baseline = "a\nb\nc\nd";
  const current = "a\nB\nc\nD\ne";

  it("shows the current text and deleted lines as ghosts by default", () => {
    const deletedBaseline = "a\nb\nc";
    const deletedCurrent = "a\nc";
    const projection = buildSessionProjection({
      baseline: deletedBaseline,
      current: deletedCurrent,
      fileShowsBaseline: false,
      flippedHunkIds: [],
    });

    expect(projection.lines.map((line) => line.role)).toEqual([
      "context",
      "deleted",
      "context",
    ]);
    expect(sessionViewText(projection.lines)).toBe("a\nb\nc");
    expect(sessionPreviewText(projection.lines)).toBe("a\nc");
  });

  it("hides added lines and restores deleted lines when the file shows the baseline", () => {
    const projection = buildSessionProjection({
      baseline,
      current,
      fileShowsBaseline: true,
      flippedHunkIds: [],
    });

    expect(sessionPreviewText(projection.lines)).toBe(baseline);
    expect(sessionViewText(projection.lines)).toBe(baseline);
    expect(projection.hunks.map((hunk) => hunk.currentStart)).toEqual([2, 4]);
  });

  it("flips one hunk back to the current text while the file shows the baseline", () => {
    const initial = buildSessionProjection({
      baseline,
      current,
      fileShowsBaseline: true,
      flippedHunkIds: [],
    });
    const trailing = initial.hunks.find((hunk) => hunk.currentStart === 4);
    expect(trailing).toBeDefined();

    const projection = buildSessionProjection({
      baseline,
      current,
      fileShowsBaseline: true,
      flippedHunkIds: [trailing?.id ?? ""],
    });

    expect(sessionPreviewText(projection.lines)).toBe("a\nb\nc\nD\ne");
  });
});

describe("applySessionViewEdit", () => {
  it("writes an edit of the current line into the working text", () => {
    const working = "a\nB\nc";
    const projection = buildSessionProjection({
      baseline: "a\nb\nc",
      current: working,
      fileShowsBaseline: false,
      flippedHunkIds: [],
    });

    const edited = applySessionViewEdit(
      projection.lines,
      projection.hidden,
      "a\nB2\nc",
      splitSourceLines(working),
    );

    expect(edited.text).toBe("a\nB2\nc");
    expect(edited.editedStart).toBe(2);
    expect(edited.editedCount).toBe(1);
  });

  it("keeps an unchanged ghost line out of the working text", () => {
    const working = "a\nc";
    const projection = buildSessionProjection({
      baseline: "a\nb\nc",
      current: working,
      fileShowsBaseline: false,
      flippedHunkIds: [],
    });

    const edited = applySessionViewEdit(
      projection.lines,
      projection.hidden,
      sessionViewText(projection.lines),
      splitSourceLines(working),
    );

    expect(edited.text).toBe(working);
    expect(edited.editedCount).toBe(0);
  });

  it("inserts a ghost line into the working text when it is edited", () => {
    const working = "a\nc";
    const projection = buildSessionProjection({
      baseline: "a\nb\nc",
      current: working,
      fileShowsBaseline: false,
      flippedHunkIds: [],
    });

    const edited = applySessionViewEdit(
      projection.lines,
      projection.hidden,
      "a\nb2\nc",
      splitSourceLines(working),
    );

    expect(edited.text).toBe("a\nb2\nc");
    expect(edited.touchedHunkIds).toEqual([projection.hunks[0]?.id]);
  });

  it("keeps a hidden added line when another line is edited", () => {
    const working = "a\nb\nadded";
    const showingOld = buildSessionProjection({
      baseline: "a\nb",
      current: working,
      fileShowsBaseline: true,
      flippedHunkIds: [],
    });

    const edited = applySessionViewEdit(
      showingOld.lines,
      showingOld.hidden,
      "a\nB",
      splitSourceLines(working),
    );

    expect(edited.text).toBe("a\nB\nadded");
  });

  it("replaces a baseline block with the text now on screen", () => {
    const working = "a\nB\nc";
    const showingOld = buildSessionProjection({
      baseline: "a\nb\nc",
      current: working,
      fileShowsBaseline: true,
      flippedHunkIds: [],
    });

    const edited = applySessionViewEdit(
      showingOld.lines,
      showingOld.hidden,
      "a\nb2\nc",
      splitSourceLines(working),
    );

    expect(edited.text).toBe("a\nb2\nc");
  });
});

describe("mapViewOffsetToWorkingOffset", () => {
  it("maps a ghost offset to the working insertion point", () => {
    const working = "a\nc";
    const projection = buildSessionProjection({
      baseline: "a\nb\nc",
      current: working,
      fileShowsBaseline: false,
      flippedHunkIds: [],
    });
    const ghostOffset = sessionViewText(projection.lines).indexOf("b");

    expect(
      mapViewOffsetToWorkingOffset(
        ghostOffset,
        projection.lines,
        projection.hidden,
        working,
      ),
    ).toBe(working.indexOf("c"));
  });
});

describe("anchorHiddenInsert", () => {
  it("places a marker after the line that precedes the hidden new lines", () => {
    expect(anchorHiddenInsert(2, [0, 1, 2])).toEqual({
      edge: "after",
      visibleIndex: 1,
    });
  });

  it("places a marker before the first line when the new lines are at the top", () => {
    expect(anchorHiddenInsert(0, [0, 1])).toEqual({
      edge: "before",
      visibleIndex: 0,
    });
  });
});

describe("buildViewFolds", () => {
  it("hides the view lines that belong to a collapsed working fold", () => {
    const projection = buildSessionProjection({
      baseline: "a\nb\nc\nd",
      current: "a\nb\nc\nd",
      fileShowsBaseline: false,
      flippedHunkIds: [],
    });
    const fold: CodeFoldRegion = {
      id: "fold-1",
      startLine: 1,
      endLine: 3,
      collapsed: true,
    };

    expect(buildViewFolds([fold], projection.lines)).toEqual([
      {
        ...fold,
        startLine: 1,
        endLine: 3,
      },
    ]);
  });
});
