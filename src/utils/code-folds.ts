export interface CodeFoldRegion {
  id: string;
  startLine: number;
  endLine: number;
  collapsed: boolean;
}

export type VisibleLineKind = "source" | "placeholder";

export interface VisibleLine {
  kind: VisibleLineKind;
  sourceLine: number;
  foldId?: string;
  hiddenLineCount?: number;
}

const FOLD_PLACEHOLDER_PREFIX = "\u200B\u200B";

export function createFoldId(): string {
  return `fold-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function rangesNestOrSeparate(
  a: Pick<CodeFoldRegion, "startLine" | "endLine">,
  b: Pick<CodeFoldRegion, "startLine" | "endLine">,
): boolean {
  const intersects =
    a.startLine <= b.endLine && b.startLine <= a.endLine;

  if (!intersects) {
    return true;
  }

  const aContainsB =
    a.startLine <= b.startLine && b.endLine <= a.endLine;
  const bContainsA =
    b.startLine <= a.startLine && a.endLine <= b.endLine;

  return aContainsB || bContainsA;
}

export function canAddFold(
  folds: CodeFoldRegion[],
  startLine: number,
  endLine: number,
): boolean {
  if (startLine < 1 || endLine < 1 || endLine <= startLine) {
    return false;
  }

  const candidate = { startLine, endLine };
  return folds.every((fold) => rangesNestOrSeparate(fold, candidate));
}

export function buildFoldPlaceholder(hiddenLineCount: number): string {
  return `${FOLD_PLACEHOLDER_PREFIX}\u22EF ${hiddenLineCount}`;
}

export function isFoldPlaceholderLine(line: string): boolean {
  return line.startsWith(FOLD_PLACEHOLDER_PREFIX);
}

export function getCollapsedFolds(folds: CodeFoldRegion[]): CodeFoldRegion[] {
  return folds.filter(
    (fold) => fold.collapsed && fold.endLine > fold.startLine,
  );
}

export function getHiddenSourceLines(
  folds: CodeFoldRegion[],
): Set<number> {
  const hidden = new Set<number>();

  for (const fold of getCollapsedFolds(folds)) {
    for (let line = fold.startLine + 1; line <= fold.endLine; line += 1) {
      hidden.add(line);
    }
  }

  return hidden;
}

export function buildVisibleLines(
  lineCount: number,
  folds: CodeFoldRegion[],
): VisibleLine[] {
  if (lineCount <= 0) {
    return [{ kind: "source", sourceLine: 1 }];
  }

  const hidden = getHiddenSourceLines(folds);
  const collapsedByStartLine = new Map<number, CodeFoldRegion>();

  for (const fold of getCollapsedFolds(folds)) {
    collapsedByStartLine.set(fold.startLine, fold);
  }

  const visible: VisibleLine[] = [];

  for (let line = 1; line <= lineCount; line += 1) {
    if (hidden.has(line)) {
      continue;
    }

    visible.push({ kind: "source", sourceLine: line });

    const collapsedFold = collapsedByStartLine.get(line);
    if (collapsedFold) {
      visible.push({
        kind: "placeholder",
        sourceLine: line,
        foldId: collapsedFold.id,
        hiddenLineCount: collapsedFold.endLine - collapsedFold.startLine,
      });
    }
  }

  return visible.length > 0 ? visible : [{ kind: "source", sourceLine: 1 }];
}

export function buildDisplayText(
  sourceLines: string[],
  folds: CodeFoldRegion[],
): string {
  const visibleLines = buildVisibleLines(sourceLines.length, folds);

  return visibleLines
    .map((item) => {
      if (item.kind === "placeholder") {
        return buildFoldPlaceholder(item.hiddenLineCount ?? 0);
      }

      return sourceLines[item.sourceLine - 1] ?? "";
    })
    .join("\n");
}

export function mergeDisplayTextIntoSource(
  displayText: string,
  previousSource: string,
  folds: CodeFoldRegion[],
): string {
  const previousLines = splitLines(previousSource);
  const displayLines = splitLines(displayText);
  const visibleLines = buildVisibleLines(previousLines.length, folds);
  const resultLines = [...previousLines];

  let displayIndex = 0;

  for (const item of visibleLines) {
    if (item.kind === "placeholder") {
      displayIndex += 1;
      continue;
    }

    if (displayIndex >= displayLines.length) {
      break;
    }

    const nextLine = displayLines[displayIndex] ?? "";
    if (isFoldPlaceholderLine(nextLine)) {
      displayIndex += 1;
      continue;
    }

    resultLines[item.sourceLine - 1] = nextLine;
    displayIndex += 1;
  }

  if (displayIndex < displayLines.length) {
    const trailingLines = displayLines
      .slice(displayIndex)
      .filter((line) => !isFoldPlaceholderLine(line));

    if (trailingLines.length > 0) {
      const insertionLine = visibleLines.reduce((maxLine, item) => {
        if (item.kind === "source") {
          return Math.max(maxLine, item.sourceLine);
        }

        return maxLine;
      }, 0);

      resultLines.splice(insertionLine, 0, ...trailingLines);
    }
  }

  return joinLines(resultLines);
}

export function mapDisplayOffsetToSourceOffset(
  displayOffset: number,
  sourceText: string,
  folds: CodeFoldRegion[],
): number {
  const sourceLines = splitLines(sourceText);
  const displayText = buildDisplayText(sourceLines, folds);

  if (displayOffset <= 0) {
    return 0;
  }

  if (displayOffset >= displayText.length) {
    return sourceText.length;
  }

  const displayLines = splitLines(displayText);
  const visibleLines = buildVisibleLines(sourceLines.length, folds);
  let displayConsumed = 0;
  let sourceConsumed = 0;

  for (let index = 0; index < visibleLines.length; index += 1) {
    const item = visibleLines[index];
    const displayLine = displayLines[index] ?? "";
    const lineLength = displayLine.length;
    const lineEnd = displayConsumed + lineLength;

    if (displayOffset <= lineEnd) {
      const offsetInLine = displayOffset - displayConsumed;

      if (item.kind === "placeholder") {
        const fold = folds.find((entry) => entry.id === item.foldId);
        if (!fold) {
          return sourceConsumed;
        }

        return getLineStartOffset(sourceLines, fold.startLine);
      }

      return getLineStartOffset(sourceLines, item.sourceLine) + offsetInLine;
    }

    displayConsumed += lineLength + 1;

    if (item.kind === "placeholder") {
      const fold = folds.find((entry) => entry.id === item.foldId);
      if (fold) {
        sourceConsumed = getLineEndOffset(sourceLines, fold.endLine);
      }
      continue;
    }

    sourceConsumed = getLineEndOffset(sourceLines, item.sourceLine);
  }

  return sourceText.length;
}

export function mapSourceOffsetToDisplayOffset(
  sourceOffset: number,
  sourceText: string,
  folds: CodeFoldRegion[],
): number {
  const sourceLines = splitLines(sourceText);
  const displayText = buildDisplayText(sourceLines, folds);

  if (sourceOffset <= 0) {
    return 0;
  }

  if (sourceOffset >= sourceText.length) {
    return displayText.length;
  }

  const sourceLine = getLineNumberAtOffset(sourceLines, sourceOffset);
  const hidden = getHiddenSourceLines(folds);
  const visibleLines = buildVisibleLines(sourceLines.length, folds);
  let displayOffset = 0;

  for (let index = 0; index < visibleLines.length; index += 1) {
    const item = visibleLines[index];

    if (item.kind === "placeholder") {
      const fold = folds.find((entry) => entry.id === item.foldId);
      if (fold && sourceLine > fold.startLine && sourceLine <= fold.endLine) {
        const placeholder = buildFoldPlaceholder(
          fold.endLine - fold.startLine,
        );
        return displayOffset + placeholder.length;
      }

      displayOffset += (splitLines(displayText)[index]?.length ?? 0) + 1;
      continue;
    }

    if (item.sourceLine === sourceLine) {
      const offsetInLine =
        sourceOffset - getLineStartOffset(sourceLines, sourceLine);
      return displayOffset + offsetInLine;
    }

    if (hidden.has(item.sourceLine)) {
      continue;
    }

    displayOffset += (sourceLines[item.sourceLine - 1]?.length ?? 0) + 1;
  }

  return displayText.length;
}

export function adjustFoldsAfterSourceChange(
  folds: CodeFoldRegion[],
  previousLines: string[],
  nextLines: string[],
): CodeFoldRegion[] {
  if (previousLines.length === nextLines.length) {
    return folds;
  }

  let prefix = 0;
  while (
    prefix < previousLines.length &&
    prefix < nextLines.length &&
    previousLines[prefix] === nextLines[prefix]
  ) {
    prefix += 1;
  }

  let previousSuffix = previousLines.length - 1;
  let nextSuffix = nextLines.length - 1;
  while (
    previousSuffix >= prefix &&
    nextSuffix >= prefix &&
    previousLines[previousSuffix] === nextLines[nextSuffix]
  ) {
    previousSuffix -= 1;
    nextSuffix -= 1;
  }

  const removedCount = Math.max(0, previousSuffix - prefix + 1);
  const insertedCount = Math.max(0, nextSuffix - prefix + 1);
  const delta = insertedCount - removedCount;
  const changeStartLine = prefix + 1;
  const changeEndLine = prefix + removedCount;

  return folds
    .map((fold) => {
      if (fold.endLine < changeStartLine) {
        return {
          ...fold,
          startLine: fold.startLine + delta,
          endLine: fold.endLine + delta,
        };
      }

      if (fold.startLine > changeEndLine) {
        return fold;
      }

      const nextEndLine = fold.endLine + delta;
      if (nextEndLine <= fold.startLine) {
        return null;
      }

      return {
        ...fold,
        endLine: nextEndLine,
      };
    })
    .filter((fold): fold is CodeFoldRegion => fold !== null);
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function joinLines(lines: string[]): string {
  return lines.join("\n");
}

function getLineStartOffset(lines: string[], lineNumber: number): number {
  let offset = 0;

  for (let index = 0; index < lineNumber - 1; index += 1) {
    offset += lines[index]?.length ?? 0;
    offset += 1;
  }

  return offset;
}

function getLineEndOffset(lines: string[], lineNumber: number): number {
  return getLineStartOffset(lines, lineNumber) + (lines[lineNumber - 1]?.length ?? 0);
}

function getLineNumberAtOffset(lines: string[], offset: number): number {
  let consumed = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const lineLength = lines[index]?.length ?? 0;
    const lineEnd = consumed + lineLength;

    if (offset <= lineEnd) {
      return index + 1;
    }

    consumed = lineEnd + 1;
  }

  return lines.length;
}
