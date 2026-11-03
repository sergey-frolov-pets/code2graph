import { EDITOR_TAB_SIZE } from "@/constants/editor-settings";
import {
  isFoldPlaceholderLine,
  mapDisplayOffsetToSourceOffset,
  mapSourceOffsetToDisplayOffset,
  type CodeFoldRegion,
} from "@/utils/code-folds";

interface LineSpan {
  text: string;
  start: number;
  end: number;
  nextStart: number;
}

export interface EditorTabEdit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface DisplayedEditorTabEdit {
  source: string;
  selectionStart: number;
  selectionEnd: number;
}

export function applyEditorTab(options: {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  outdent: boolean;
  tabSize?: number;
}): EditorTabEdit {
  const tabSize = options.tabSize ?? EDITOR_TAB_SIZE;
  const text = options.text;
  const selectionStart = clampOffset(
    Math.min(options.selectionStart, options.selectionEnd),
    text.length,
  );
  const selectionEnd = clampOffset(
    Math.max(options.selectionStart, options.selectionEnd),
    text.length,
  );
  const { lines, newline } = splitLineSpans(text);
  const spansMultipleLines = text.slice(selectionStart, selectionEnd).includes("\n");

  if (!options.outdent && selectionStart === selectionEnd) {
    return insertTabAtSelection(text, lines, selectionStart, selectionEnd, tabSize);
  }

  const range = lineRange(lines, selectionStart, selectionEnd);
  const nextLines = lines.map((line, index) => {
    if (index < range.from || index > range.to) {
      return line.text;
    }

    return options.outdent
      ? removeIndentPrefix(line.text, tabSize)
      : `${indentUnit(tabSize)}${line.text}`;
  });
  const nextText = nextLines.join(newline);

  if (!spansMultipleLines) {
    const line = lines[range.from];
    if (!line) {
      return {
        text: nextText,
        selectionStart,
        selectionEnd,
      };
    }

    const removed = line.text.length - (nextLines[range.from]?.length ?? 0);
    return {
      text: nextText,
      selectionStart: line.start + Math.max(0, selectionStart - line.start - removed),
      selectionEnd: line.start + Math.max(0, selectionEnd - line.start - removed),
    };
  }

  return {
    text: nextText,
    selectionStart: blockSelectionStart(nextLines, newline, range.from),
    selectionEnd: blockSelectionEnd(nextLines, newline, range.from, range.to),
  };
}

export function isEditorTabTargetPlaceholder(
  displayText: string,
  selectionStart: number,
  selectionEnd: number,
): boolean {
  const start = clampOffset(
    Math.min(selectionStart, selectionEnd),
    displayText.length,
  );
  const end = clampOffset(
    Math.max(selectionStart, selectionEnd),
    displayText.length,
  );
  const lines = displayText.split("\n");
  let consumed = 0;
  let coversPlaceholder = false;
  let coversSourceLine = false;

  for (const line of lines) {
    const lineEnd = consumed + line.length;
    const caretOnLine = start === end && start >= consumed && start <= lineEnd;
    const rangeOverlapsLine = start < end && start <= lineEnd && end > consumed;

    if (caretOnLine || rangeOverlapsLine) {
      if (isFoldPlaceholderLine(line)) {
        coversPlaceholder = true;
      } else {
        coversSourceLine = true;
      }
    }

    consumed = lineEnd + 1;
  }

  return coversPlaceholder && !coversSourceLine;
}

export function applyDisplayedEditorTab(options: {
  source: string;
  folds: CodeFoldRegion[];
  displayText: string;
  selectionStart: number;
  selectionEnd: number;
  outdent: boolean;
}): DisplayedEditorTabEdit | null {
  if (
    isEditorTabTargetPlaceholder(
      options.displayText,
      options.selectionStart,
      options.selectionEnd,
    )
  ) {
    return null;
  }

  const edited = applyEditorTab({
    text: options.source,
    selectionStart: mapDisplayOffsetToSourceOffset(
      options.selectionStart,
      options.source,
      options.folds,
    ),
    selectionEnd: mapDisplayOffsetToSourceOffset(
      options.selectionEnd,
      options.source,
      options.folds,
    ),
    outdent: options.outdent,
  });

  return {
    source: edited.text,
    selectionStart: mapSourceOffsetToDisplayOffset(
      edited.selectionStart,
      edited.text,
      options.folds,
    ),
    selectionEnd: mapSourceOffsetToDisplayOffset(
      edited.selectionEnd,
      edited.text,
      options.folds,
    ),
  };
}

function insertTabAtSelection(
  text: string,
  lines: LineSpan[],
  selectionStart: number,
  selectionEnd: number,
  tabSize: number,
): EditorTabEdit {
  const line = lines[lineIndexAt(lines, selectionStart)] ?? {
    text: "",
    start: 0,
    end: 0,
    nextStart: 0,
  };
  const column = visualColumn(line.text.slice(0, selectionStart - line.start), tabSize);
  const insert = " ".repeat(spacesUntilNextTabStop(column, tabSize));
  const nextText = `${text.slice(0, selectionStart)}${insert}${text.slice(selectionEnd)}`;
  const caret = selectionStart + insert.length;

  return {
    text: nextText,
    selectionStart: caret,
    selectionEnd: caret,
  };
}

function splitLineSpans(text: string): { lines: LineSpan[]; newline: string } {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const parts = text.split(/\r?\n/);
  const lines: LineSpan[] = [];
  let offset = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? "";
    const start = offset;
    const end = start + part.length;
    offset = end;

    if (index < parts.length - 1) {
      offset += newline.length;
    }

    lines.push({
      text: part,
      start,
      end,
      nextStart: offset,
    });
  }

  return { lines, newline };
}

function lineIndexAt(lines: LineSpan[], offset: number): number {
  if (lines.length === 0) {
    return 0;
  }

  const lastLine = lines[lines.length - 1];
  const clamped = Math.min(
    Math.max(0, offset),
    lastLine?.nextStart ?? 0,
  );

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    if (index === lines.length - 1 || clamped < line.nextStart) {
      return index;
    }
  }

  return lines.length - 1;
}

function lineRange(
  lines: LineSpan[],
  selectionStart: number,
  selectionEnd: number,
): { from: number; to: number } {
  const from = lineIndexAt(lines, selectionStart);
  if (selectionStart === selectionEnd) {
    return { from, to: from };
  }

  const to = lineIndexAt(lines, selectionEnd - 1);
  return { from, to: Math.max(from, to) };
}

function visualColumn(prefix: string, tabSize: number): number {
  let column = 0;

  for (const char of prefix) {
    if (char === "\t") {
      column += spacesUntilNextTabStop(column, tabSize);
      continue;
    }

    column += 1;
  }

  return column;
}

function spacesUntilNextTabStop(column: number, tabSize: number): number {
  const remainder = column % tabSize;
  return remainder === 0 ? tabSize : tabSize - remainder;
}

function indentUnit(tabSize: number): string {
  return " ".repeat(tabSize);
}

function removeIndentPrefix(line: string, tabSize: number): string {
  if (line.startsWith("\t")) {
    return line.slice(1);
  }

  let removeCount = 0;
  while (removeCount < tabSize && line[removeCount] === " ") {
    removeCount += 1;
  }

  return line.slice(removeCount);
}

function blockSelectionStart(
  lines: string[],
  newline: string,
  from: number,
): number {
  let offset = 0;

  for (let index = 0; index < from; index += 1) {
    offset += (lines[index]?.length ?? 0) + newline.length;
  }

  return offset;
}

function blockSelectionEnd(
  lines: string[],
  newline: string,
  from: number,
  to: number,
): number {
  let offset = blockSelectionStart(lines, newline, from);

  for (let index = from; index <= to; index += 1) {
    offset += lines[index]?.length ?? 0;
    if (index < to) {
      offset += newline.length;
    }
  }

  return offset;
}

function clampOffset(offset: number, length: number): number {
  if (!Number.isFinite(offset)) {
    return 0;
  }

  return Math.min(Math.max(0, offset), length);
}
