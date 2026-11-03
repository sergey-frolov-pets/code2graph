import {
  isFoldPlaceholderLine,
  mapDisplayOffsetToSourceOffset,
  type CodeFoldRegion,
} from "@/utils/code-folds";

const LEADING_INDENT_PATTERN = /^[ \t]*/;
const LINE_FEED = "\n";
const CARRIAGE_RETURN = "\r";

export interface EnterAtLineEndEdit {
  text: string;
  cursor: number;
}

export interface AppliedEnterAtLineEnd {
  source: string;
  sourceCursor: number;
}

/**
 * Enter at the end of a line inserts a newline and copies that line's leading
 * indent, so the caret sits under its first non-whitespace character.
 * Returns null when the caret is not at the end of a real source line.
 */
export function applyEnterAtLineEnd(
  displayText: string,
  caret: number,
  source: string,
  folds: CodeFoldRegion[],
): AppliedEnterAtLineEnd | null {
  if (!isCaretAtLineEnd(displayText, caret)) {
    return null;
  }

  if (isFoldPlaceholderLine(lineAt(displayText, caret))) {
    return null;
  }

  const sourceCaret = mapDisplayOffsetToSourceOffset(caret, source, folds);
  const edited = insertEnterAtLineEnd(source, sourceCaret);
  if (!edited) {
    return null;
  }

  return {
    source: edited.text,
    sourceCursor: edited.cursor,
  };
}

export function insertEnterAtLineEnd(
  text: string,
  caret: number,
): EnterAtLineEndEdit | null {
  if (!isCaretAtLineEnd(text, caret)) {
    return null;
  }

  const lineStart = findLineStart(text, caret);
  const indent =
    LEADING_INDENT_PATTERN.exec(text.slice(lineStart, caret))?.[0] ?? "";
  const inserted = `${LINE_FEED}${indent}`;
  const breakEnd = consumeLineBreak(text, caret);
  const suffix =
    breakEnd > caret ? `${LINE_FEED}${text.slice(breakEnd)}` : text.slice(caret);

  return {
    text: `${text.slice(0, caret)}${inserted}${suffix}`,
    cursor: caret + inserted.length,
  };
}

function isCaretAtLineEnd(text: string, caret: number): boolean {
  if (!Number.isInteger(caret) || caret < 0 || caret > text.length) {
    return false;
  }

  if (caret === text.length) {
    return true;
  }

  const next = text[caret];
  return next === LINE_FEED || next === CARRIAGE_RETURN;
}

function findLineStart(text: string, caret: number): number {
  if (caret <= 0) {
    return 0;
  }

  return text.lastIndexOf(LINE_FEED, caret - 1) + 1;
}

function consumeLineBreak(text: string, caret: number): number {
  let end = caret;
  if (text[end] === CARRIAGE_RETURN) {
    end += 1;
  }
  if (text[end] === LINE_FEED) {
    end += 1;
  }
  return end;
}

function lineAt(text: string, caret: number): string {
  const lineStart = findLineStart(text, caret);
  const lineEnd = text.indexOf(LINE_FEED, caret);
  return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
}
