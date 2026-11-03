import { describe, expect, it } from "vitest";
import {
  buildDisplayText,
  createFoldId,
  type CodeFoldRegion,
} from "@/utils/code-folds";
import {
  applyEnterAtLineEnd,
  insertEnterAtLineEnd,
} from "@/utils/editor-enter-indent";

function columnAt(text: string, offset: number): number {
  return offset - (text.lastIndexOf("\n", offset - 1) + 1);
}

function columnOfFirstGlyph(line: string): number {
  const match = /[^ \t]/.exec(line);
  return match ? match.index : line.length;
}

function makeFold(startLine: number, endLine: number): CodeFoldRegion {
  return {
    id: createFoldId(),
    startLine,
    endLine,
    collapsed: true,
  };
}

describe("insertEnterAtLineEnd", () => {
  it("places the caret under the first character of an indented line", () => {
    const line = "    participant Alice";
    const edited = insertEnterAtLineEnd(`${line}\nnext`, line.length);

    expect(edited).toEqual({
      text: "    participant Alice\n    \nnext",
      cursor: "    participant Alice\n    ".length,
    });
    expect(columnAt(edited!.text, edited!.cursor)).toBe(
      columnOfFirstGlyph(line),
    );
  });

  it("keeps the caret at column zero when the line has no indent", () => {
    const edited = insertEnterAtLineEnd("alpha\nbeta", "alpha".length);

    expect(edited).toEqual({
      text: "alpha\n\nbeta",
      cursor: "alpha\n".length,
    });
    expect(columnAt(edited!.text, edited!.cursor)).toBe(0);
  });

  it("copies a tab indent so the caret stays under the first glyph", () => {
    const line = "\t\tstate Idle";
    const edited = insertEnterAtLineEnd(line, line.length);

    expect(edited?.text).toBe("\t\tstate Idle\n\t\t");
    expect(columnAt(edited!.text, edited!.cursor)).toBe(
      columnOfFirstGlyph(line),
    );
  });

  it("appends an indented line when Enter is pressed at the end of the text", () => {
    const edited = insertEnterAtLineEnd("  tail", "  tail".length);

    expect(edited).toEqual({
      text: "  tail\n  ",
      cursor: "  tail\n  ".length,
    });
  });

  it("keeps the indent of a whitespace-only line", () => {
    const edited = insertEnterAtLineEnd("   \nnext", "   ".length);

    expect(edited?.text).toBe("   \n   \nnext");
    expect(columnAt(edited!.text, edited!.cursor)).toBe("   ".length);
  });

  it("does not treat a caret in the middle of a line as the end", () => {
    expect(insertEnterAtLineEnd("    alpha", 4)).toBeNull();
    expect(insertEnterAtLineEnd("    alpha\n", 6)).toBeNull();
  });

  it("creates a second line when Enter is pressed in an empty editor", () => {
    expect(insertEnterAtLineEnd("", 0)).toEqual({
      text: "\n",
      cursor: 1,
    });
  });

  it("ignores a caret outside the text", () => {
    expect(insertEnterAtLineEnd("alpha", -1)).toBeNull();
    expect(insertEnterAtLineEnd("alpha", 6)).toBeNull();
  });

  it("does not drag a carriage return onto the new line", () => {
    const source = "    hi\r\nnext";
    const edited = insertEnterAtLineEnd(source, "    hi".length);

    expect(edited?.text).toBe("    hi\n    \nnext");
    expect(columnAt(edited!.text, edited!.cursor)).toBe(4);
  });
});

describe("applyEnterAtLineEnd", () => {
  it("updates the source and keeps the caret under the first glyph", () => {
    const source = "    class Dog\n    class Cat";
    const caret = "    class Dog".length;
    const edited = applyEnterAtLineEnd(source, caret, source, []);

    expect(edited?.source).toBe("    class Dog\n    \n    class Cat");
    expect(columnAt(edited!.source, edited!.sourceCursor)).toBe(
      columnOfFirstGlyph("    class Dog"),
    );
  });

  it("indents after the last visible line when a fold is collapsed above it", () => {
    const source = "    keep\nhidden\n    tail";
    const folds = [makeFold(1, 2)];
    const display = buildDisplayText(source.split("\n"), folds);
    const edited = applyEnterAtLineEnd(display, display.length, source, folds);

    expect(edited?.source).toBe("    keep\nhidden\n    tail\n    ");
    expect(columnAt(edited!.source, edited!.sourceCursor)).toBe(4);
  });

  it("leaves a collapsed placeholder line to the browser", () => {
    const source = "alpha\nhidden\nomega";
    const folds = [makeFold(1, 2)];
    const display = buildDisplayText(source.split("\n"), folds);
    const placeholderLine = display.split("\n")[1] ?? "";
    const caret = display.indexOf(placeholderLine) + placeholderLine.length;

    expect(applyEnterAtLineEnd(display, caret, source, folds)).toBeNull();
  });
});
