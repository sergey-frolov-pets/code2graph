import { describe, expect, it } from "vitest";
import { EDITOR_TAB_SIZE } from "@/constants/editor-settings";
import {
  buildDisplayText,
  isFoldPlaceholderLine,
  type CodeFoldRegion,
} from "@/utils/code-folds";
import {
  applyDisplayedEditorTab,
  applyEditorTab,
} from "@/utils/editor-indent";

const TAB_SIZE = EDITOR_TAB_SIZE;

function collapsedFold(startLine: number, endLine: number): CodeFoldRegion {
  return {
    id: `fold-${startLine}-${endLine}`,
    startLine,
    endLine,
    collapsed: true,
  };
}

function placeholderOffset(displayText: string): number {
  const lines = displayText.split("\n");
  const placeholderIndex = lines.findIndex((line) => isFoldPlaceholderLine(line));
  let offset = 0;

  for (let index = 0; index < placeholderIndex; index += 1) {
    offset += (lines[index]?.length ?? 0) + 1;
  }

  return offset;
}

describe("applyEditorTab", () => {
  it("inserts spaces up to the next tab stop at the caret", () => {
    const atLineStart = applyEditorTab({
      text: "Alice -> Bob",
      selectionStart: 0,
      selectionEnd: 0,
      outdent: false,
    });
    const midStop = applyEditorTab({
      text: "Alice -> Bob",
      selectionStart: 1,
      selectionEnd: 1,
      outdent: false,
    });

    expect(atLineStart.text).toBe(`${" ".repeat(TAB_SIZE)}Alice -> Bob`);
    expect(atLineStart.selectionStart).toBe(TAB_SIZE);
    expect(midStop.text).toBe(`A${" ".repeat(TAB_SIZE - 1)}lice -> Bob`);
    expect(midStop.selectionStart).toBe(TAB_SIZE);
  });

  it("indents the whole line when part of that line is selected", () => {
    const edit = applyEditorTab({
      text: "abcdef",
      selectionStart: 1,
      selectionEnd: 3,
      outdent: false,
    });

    expect(edit.text).toBe(`${" ".repeat(TAB_SIZE)}abcdef`);
    expect(edit.selectionStart).toBe(1 + TAB_SIZE);
    expect(edit.selectionEnd).toBe(3 + TAB_SIZE);
  });

  it("indents every line of a multiline selection and keeps the block selected", () => {
    const edit = applyEditorTab({
      text: "alpha\nbeta\ngamma",
      selectionStart: 0,
      selectionEnd: "alpha\nbeta\ngamma".length,
      outdent: false,
    });

    expect(edit.text).toBe("  alpha\n  beta\n  gamma");
    expect(edit.selectionStart).toBe(0);
    expect(edit.selectionEnd).toBe(edit.text.length);

    const again = applyEditorTab({
      text: edit.text,
      selectionStart: edit.selectionStart,
      selectionEnd: edit.selectionEnd,
      outdent: false,
    });

    expect(again.text).toBe("    alpha\n    beta\n    gamma");
  });

  it("does not indent the following line when the selection ends at its start", () => {
    const source = "alpha\nbeta";
    const edit = applyEditorTab({
      text: source,
      selectionStart: 0,
      selectionEnd: "alpha\n".length,
      outdent: false,
    });

    expect(edit.text).toBe("  alpha\nbeta");
  });

  it("outdents one level and keeps the caret relative to the text", () => {
    const edit = applyEditorTab({
      text: "    hello",
      selectionStart: 6,
      selectionEnd: 6,
      outdent: true,
    });

    expect(edit.text).toBe("  hello");
    expect(edit.selectionStart).toBe(4);
  });

  it("removes a leading tab before removing spaces", () => {
    const edit = applyEditorTab({
      text: "\t  note",
      selectionStart: 0,
      selectionEnd: 0,
      outdent: true,
    });

    expect(edit.text).toBe("  note");
    expect(edit.selectionStart).toBe(0);
  });

  it("leaves a line without indent unchanged", () => {
    const edit = applyEditorTab({
      text: "title",
      selectionStart: 2,
      selectionEnd: 2,
      outdent: true,
    });

    expect(edit).toEqual({
      text: "title",
      selectionStart: 2,
      selectionEnd: 2,
    });
  });

  it("preserves CRLF while indenting a block", () => {
    const edit = applyEditorTab({
      text: "alpha\r\nbeta",
      selectionStart: 0,
      selectionEnd: "alpha\r\nbeta".length,
      outdent: false,
    });

    expect(edit.text).toBe("  alpha\r\n  beta");
  });

  it("does not indent the next CRLF line when the selection ends at its start", () => {
    const edit = applyEditorTab({
      text: "alpha\r\nbeta",
      selectionStart: 0,
      selectionEnd: "alpha\r\n".length,
      outdent: false,
    });

    expect(edit.text).toBe("  alpha\r\nbeta");
  });

  it("outdents the line where a CRLF caret sits", () => {
    const caret = "alpha\r\n".length;
    const edit = applyEditorTab({
      text: "alpha\r\n  beta",
      selectionStart: caret,
      selectionEnd: caret,
      outdent: true,
    });

    expect(edit.text).toBe("alpha\r\nbeta");
    expect(edit.selectionStart).toBe(caret);
  });

  it("accounts for an existing tab when choosing the next tab stop", () => {
    const edit = applyEditorTab({
      text: "\tX",
      selectionStart: 1,
      selectionEnd: 1,
      outdent: false,
    });

    expect(edit.text).toBe(`\t${" ".repeat(TAB_SIZE)}X`);
    expect(edit.selectionStart).toBe(1 + TAB_SIZE);
  });
});

describe("applyDisplayedEditorTab", () => {
  it("indents a visible line without touching hidden fold lines outside the selection", () => {
    const source = "alpha\nbeta\ngamma\ndelta";
    const folds = [collapsedFold(2, 3)];
    const display = buildDisplayText(source.split("\n"), folds);
    const caret = display.indexOf("delta");
    const edit = applyDisplayedEditorTab({
      source,
      folds,
      displayText: display,
      selectionStart: caret,
      selectionEnd: caret,
      outdent: false,
    });

    expect(edit?.source).toBe("alpha\nbeta\ngamma\n  delta");
    expect(edit?.selectionStart).toBe(display.indexOf("delta") + TAB_SIZE);
  });

  it("indents hidden lines inside a selection that spans a collapsed fold", () => {
    const source = "alpha\nbeta\ngamma\ndelta";
    const folds = [collapsedFold(2, 3)];
    const display = buildDisplayText(source.split("\n"), folds);
    const edit = applyDisplayedEditorTab({
      source,
      folds,
      displayText: display,
      selectionStart: 0,
      selectionEnd: display.length,
      outdent: false,
    });

    expect(edit?.source).toBe("  alpha\n  beta\n  gamma\n  delta");
  });

  it("does not change source when the caret is on a fold placeholder", () => {
    const source = "alpha\nbeta\ngamma\ndelta";
    const folds = [collapsedFold(2, 3)];
    const display = buildDisplayText(source.split("\n"), folds);
    const offset = placeholderOffset(display);
    const edit = applyDisplayedEditorTab({
      source,
      folds,
      displayText: display,
      selectionStart: offset,
      selectionEnd: offset + 1,
      outdent: false,
    });

    expect(edit).toBeNull();
  });
});
