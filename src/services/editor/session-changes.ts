import { isBookmark, type CodeFoldRegion } from "@/utils/code-folds";

export type SessionChangeKind = "insert" | "delete" | "modify";

export type SessionLineRole = "context" | "added" | "modified" | "deleted";

export interface SessionChangeHunk {
  id: string;
  kind: SessionChangeKind;
  baselineStart: number;
  baselineCount: number;
  currentStart: number;
  currentCount: number;
}

export interface SessionViewLine {
  text: string;
  role: SessionLineRole;
  hunkId: string | null;
  showsBaseline: boolean;
  workingLines: number[];
  groupId: string | null;
  gutterLine: number;
  foldLine: number | null;
  anchorWorkingLine: number | null;
}

export interface HiddenWorkingSpan {
  hunkId: string;
  workingLines: number[];
  beforeViewIndex: number;
}

export interface SessionProjection {
  lines: SessionViewLine[];
  hidden: HiddenWorkingSpan[];
  hunks: SessionChangeHunk[];
}

export interface SessionViewEdit {
  text: string;
  editedStart: number;
  editedCount: number;
  touchedHunkIds: string[];
}

interface LineOp {
  type: "equal" | "insert" | "delete";
  baselineIndex: number;
  currentIndex: number;
}

const HUNK_ID_SEPARATOR = ":";

export function splitSourceLines(source: string): string[] {
  return source.split(/\r?\n/);
}

export function joinSourceLines(lines: string[]): string {
  return lines.join("\n");
}

export function diffSessionHunks(
  baselineLines: string[],
  currentLines: string[],
): SessionChangeHunk[] {
  return hunksFromOps(diffLineOps(baselineLines, currentLines));
}

export function buildSessionProjection(input: {
  baseline: string;
  current: string;
  fileShowsBaseline: boolean;
  flippedHunkIds: readonly string[];
}): SessionProjection {
  const baselineLines = splitSourceLines(input.baseline);
  const currentLines = splitSourceLines(input.current);
  const hunks = diffSessionHunks(baselineLines, currentLines);
  const flipped = new Set(input.flippedHunkIds);
  const lines: SessionViewLine[] = [];
  const hidden: HiddenWorkingSpan[] = [];
  let currentIndex = 0;

  for (const hunk of hunks) {
    while (
      currentIndex < hunk.currentStart - 1 &&
      currentIndex < currentLines.length
    ) {
      lines.push(
        contextLine(
          currentLines[currentIndex] ?? "",
          currentIndex + 1,
        ),
      );
      currentIndex += 1;
    }

    const showOld = hunkShowsBaseline(
      hunk.id,
      input.fileShowsBaseline,
      flipped,
    );

    if (hunk.kind === "insert") {
      if (showOld) {
        hidden.push({
          hunkId: hunk.id,
          workingLines: lineRange(hunk.currentStart, hunk.currentCount),
          beforeViewIndex: lines.length,
        });
      } else {
        for (let offset = 0; offset < hunk.currentCount; offset += 1) {
          const workingLine = hunk.currentStart + offset;
          lines.push({
            text: currentLines[workingLine - 1] ?? "",
            role: "added",
            hunkId: hunk.id,
            showsBaseline: false,
            workingLines: [workingLine],
            groupId: null,
            gutterLine: workingLine,
            foldLine: workingLine,
            anchorWorkingLine: null,
          });
        }
      }
      currentIndex = hunk.currentStart - 1 + hunk.currentCount;
      continue;
    }

    if (hunk.kind === "delete") {
      for (let offset = 0; offset < hunk.baselineCount; offset += 1) {
        const baselineLine = hunk.baselineStart + offset;
        lines.push({
          text: baselineLines[baselineLine - 1] ?? "",
          role: "deleted",
          hunkId: hunk.id,
          showsBaseline: showOld,
          workingLines: [],
          groupId: hunk.id,
          gutterLine: baselineLine,
          foldLine: null,
          anchorWorkingLine: hunk.currentStart,
        });
      }
      continue;
    }

    if (showOld) {
      const workingLines = lineRange(hunk.currentStart, hunk.currentCount);
      for (let offset = 0; offset < hunk.baselineCount; offset += 1) {
        const baselineLine = hunk.baselineStart + offset;
        lines.push({
          text: baselineLines[baselineLine - 1] ?? "",
          role: "modified",
          hunkId: hunk.id,
          showsBaseline: true,
          workingLines,
          groupId: hunk.id,
          gutterLine: baselineLine,
          foldLine: offset === 0 ? (workingLines[0] ?? null) : null,
          anchorWorkingLine: null,
        });
      }
    } else {
      for (let offset = 0; offset < hunk.currentCount; offset += 1) {
        const workingLine = hunk.currentStart + offset;
        lines.push({
          text: currentLines[workingLine - 1] ?? "",
          role: "modified",
          hunkId: hunk.id,
          showsBaseline: false,
          workingLines: [workingLine],
          groupId: null,
          gutterLine: workingLine,
          foldLine: workingLine,
          anchorWorkingLine: null,
        });
      }
    }

    currentIndex = hunk.currentStart - 1 + hunk.currentCount;
  }

  while (currentIndex < currentLines.length) {
    lines.push(
      contextLine(currentLines[currentIndex] ?? "", currentIndex + 1),
    );
    currentIndex += 1;
  }

  return { lines, hidden, hunks };
}

export function sessionViewText(lines: readonly SessionViewLine[]): string {
  return joinSourceLines(lines.map((line) => line.text));
}

export function sessionPreviewText(lines: readonly SessionViewLine[]): string {
  return joinSourceLines(
    lines
      .filter((line) => line.role !== "deleted" || line.showsBaseline)
      .map((line) => line.text),
  );
}

export function hunkShowsBaseline(
  hunkId: string,
  fileShowsBaseline: boolean,
  flippedHunkIds: ReadonlySet<string>,
): boolean {
  const flipped = flippedHunkIds.has(hunkId);
  return fileShowsBaseline ? !flipped : flipped;
}

export function applySessionViewEdit(
  previousLines: readonly SessionViewLine[],
  hidden: readonly HiddenWorkingSpan[],
  nextText: string,
  workingLines: readonly string[],
): SessionViewEdit {
  const previousTexts = previousLines.map((line) => line.text);
  const nextLines = splitSourceLines(nextText);
  const changed = findChangedLineSpan(previousTexts, nextLines);

  if (
    changed.prefix === previousTexts.length &&
    changed.oldEnd === previousTexts.length &&
    changed.newEnd === nextLines.length
  ) {
    return {
      text: joinSourceLines([...workingLines]),
      editedStart: 1,
      editedCount: 0,
      touchedHunkIds: [],
    };
  }

  const nodes = buildEditNodes(previousLines, hidden);
  const replacement = nextLines.slice(changed.prefix, changed.newEnd);
  const pureInsertion = changed.oldEnd === changed.prefix;
  const touched = new Set<string>();
  const result: string[] = [];
  let editedStart = 1;
  let editedCount = 0;
  let injected = false;

  function emitReplacement(): void {
    if (injected) {
      return;
    }
    editedStart = result.length + 1;
    editedCount = replacement.length;
    result.push(...replacement);
    injected = true;
  }

  for (const node of nodes) {
    if (node.kind === "hidden") {
      const insideChange =
        !pureInsertion &&
        node.beforeViewIndex > changed.prefix &&
        node.beforeViewIndex < changed.oldEnd;
      if (insideChange) {
        if (node.hunkId) {
          touched.add(node.hunkId);
        }
        continue;
      }

      if (pureInsertion && node.beforeViewIndex === changed.prefix) {
        emitWorking(result, workingLines, node.workingLines);
        emitReplacement();
        continue;
      }

      emitWorking(result, workingLines, node.workingLines);
      continue;
    }

    const overlaps =
      !pureInsertion &&
      node.viewIndex < changed.oldEnd &&
      node.viewIndex + node.viewCount > changed.prefix;

    if (pureInsertion && node.viewIndex === changed.prefix) {
      emitReplacement();
    }

    if (!overlaps) {
      emitWorking(result, workingLines, node.workingLines);
      continue;
    }

    if (node.hunkId) {
      touched.add(node.hunkId);
    }

    if (injected) {
      continue;
    }

    const runEnd = lastOverlappingIndex(nodes, node, changed);
    const viewFrom = node.viewIndex;
    const last = nodes[runEnd];
    const viewTo =
      last?.kind === "line" ? last.viewIndex + last.viewCount : viewFrom;
    const composed: string[] = [];
    let usedReplacement = false;

    for (let index = viewFrom; index < viewTo; index += 1) {
      if (index < changed.prefix || index >= changed.oldEnd) {
        composed.push(previousLines[index]?.text ?? "");
        continue;
      }
      if (!usedReplacement) {
        composed.push(...replacement);
        usedReplacement = true;
      }
    }

    if (!usedReplacement) {
      composed.push(...replacement);
    }

    for (let index = nodes.indexOf(node); index <= runEnd; index += 1) {
      const current = nodes[index];
      if (current?.kind === "line" && current.hunkId) {
        touched.add(current.hunkId);
      }
      if (current?.kind === "hidden" && current.hunkId) {
        touched.add(current.hunkId);
      }
    }

    editedStart = result.length + 1;
    editedCount = composed.length;
    result.push(...composed);
    injected = true;
  }

  if (!injected) {
    emitReplacement();
  }

  return {
    text: joinSourceLines(result),
    editedStart,
    editedCount,
    touchedHunkIds: [...touched],
  };
}

export function mapViewOffsetToWorkingOffset(
  viewOffset: number,
  lines: readonly SessionViewLine[],
  hidden: readonly HiddenWorkingSpan[],
  workingText: string,
): number {
  const workingLines = splitSourceLines(workingText);
  const nodes = buildEditNodes(lines, hidden);
  let viewCursor = 0;
  let workingCursor = 0;
  const safeOffset = Math.max(0, viewOffset);

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) {
      continue;
    }

    if (node.kind === "hidden") {
      workingCursor = endOfWorkingLines(workingLines, node.workingLines, workingCursor);
      continue;
    }

    const chunkLength = viewChunkLength(lines, node.viewIndex, node.viewCount);
    const chunkEnd = viewCursor + chunkLength;
    const isLast = index === nodes.length - 1;

    if (safeOffset <= chunkEnd || isLast) {
      const within = Math.max(0, safeOffset - viewCursor);
      if (node.workingLines.length === 1 && node.viewCount === 1) {
        const workingLine = node.workingLines[0] ?? 1;
        const lineStart = lineStartOffset(workingLines, workingLine);
        const lineLength = workingLines[workingLine - 1]?.length ?? 0;
        return lineStart + Math.min(within, lineLength);
      }

      if (node.workingLines.length === 0) {
        const nextWorkingLine = nodes
          .slice(index + 1)
          .find(
            (candidate) =>
              candidate.kind === "line" && candidate.workingLines.length > 0,
          );
        if (nextWorkingLine && nextWorkingLine.kind === "line") {
          return lineStartOffset(
            workingLines,
            nextWorkingLine.workingLines[0] ?? 1,
          );
        }

        return workingText.length;
      }

      const workingStart = lineStartOffset(
        workingLines,
        node.workingLines[0] ?? 1,
      );
      const workingEnd = endOfWorkingLines(
        workingLines,
        node.workingLines,
        workingStart,
      );
      return within <= 0 ? workingStart : workingEnd;
    }

    viewCursor = chunkEnd + 1;
    workingCursor = endOfWorkingLines(
      workingLines,
      node.workingLines,
      workingCursor,
    );
  }

  return workingText.length;
}

export function offsetOfWorkingLine(
  lines: readonly SessionViewLine[],
  hidden: readonly HiddenWorkingSpan[],
  workingLine: number,
): number {
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (
      hidden.some(
        (span) =>
          span.beforeViewIndex === index &&
          span.workingLines.includes(workingLine),
      )
    ) {
      return offset;
    }

    const line = lines[index];
    if (
      line &&
      (line.workingLines.includes(workingLine) || line.foldLine === workingLine)
    ) {
      return offset;
    }

    offset += (line?.text.length ?? 0) + 1;
  }

  return Math.max(0, offset - 1);
}

export function buildViewFolds(
  folds: readonly CodeFoldRegion[],
  lines: readonly SessionViewLine[],
): CodeFoldRegion[] {
  const translated: CodeFoldRegion[] = [];

  for (const fold of folds) {
    if (!fold.collapsed || isBookmark(fold)) {
      continue;
    }

    const hiddenWorking = new Set<number>();
    for (let line = fold.startLine + 1; line <= fold.endLine; line += 1) {
      hiddenWorking.add(line);
    }

    let startView = -1;
    let endView = -1;

    lines.forEach((line, index) => {
      const coversStart =
        line.workingLines.includes(fold.startLine) ||
        line.foldLine === fold.startLine;
      if (coversStart && startView < 0) {
        startView = index + 1;
      }

      const coversHidden = line.workingLines.some((workingLine) =>
        hiddenWorking.has(workingLine),
      );
      const ghostHidden =
        line.anchorWorkingLine !== null &&
        hiddenWorking.has(line.anchorWorkingLine);
      if (!coversStart && (coversHidden || ghostHidden)) {
        endView = index + 1;
      }
    });

    if (startView > 0 && endView > startView) {
      translated.push({
        ...fold,
        startLine: startView,
        endLine: endView,
      });
    }
  }

  return translated;
}

function contextLine(text: string, workingLine: number): SessionViewLine {
  return {
    text,
    role: "context",
    hunkId: null,
    showsBaseline: false,
    workingLines: [workingLine],
    groupId: null,
    gutterLine: workingLine,
    foldLine: workingLine,
    anchorWorkingLine: null,
  };
}

function lineRange(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => start + index);
}

function hunkId(hunk: Omit<SessionChangeHunk, "id">): string {
  return [
    hunk.kind,
    hunk.baselineStart,
    hunk.baselineCount,
    hunk.currentStart,
    hunk.currentCount,
  ].join(HUNK_ID_SEPARATOR);
}

function diffLineOps(baseline: string[], current: string[]): LineOp[] {
  let prefix = 0;
  while (
    prefix < baseline.length &&
    prefix < current.length &&
    baseline[prefix] === current[prefix]
  ) {
    prefix += 1;
  }

  let baselineEnd = baseline.length - 1;
  let currentEnd = current.length - 1;
  while (
    baselineEnd >= prefix &&
    currentEnd >= prefix &&
    baseline[baselineEnd] === current[currentEnd]
  ) {
    baselineEnd -= 1;
    currentEnd -= 1;
  }

  const ops: LineOp[] = [];
  for (let index = 0; index < prefix; index += 1) {
    ops.push({ type: "equal", baselineIndex: index, currentIndex: index });
  }

  const middleBaseline = baseline.slice(prefix, baselineEnd + 1);
  const middleCurrent = current.slice(prefix, currentEnd + 1);
  ops.push(
    ...diffMiddle(middleBaseline, middleCurrent).map((op) => ({
      type: op.type,
      baselineIndex: op.baselineIndex + prefix,
      currentIndex: op.currentIndex + prefix,
    })),
  );

  const baselineSuffix = baselineEnd + 1;
  const currentSuffix = currentEnd + 1;
  for (let offset = 0; offset < baseline.length - baselineSuffix; offset += 1) {
    ops.push({
      type: "equal",
      baselineIndex: baselineSuffix + offset,
      currentIndex: currentSuffix + offset,
    });
  }

  return ops;
}

function diffMiddle(baseline: string[], current: string[]): LineOp[] {
  if (baseline.length === 0 && current.length === 0) {
    return [];
  }

  const rows = baseline.length + 1;
  const columns = current.length + 1;
  const scores: number[] = new Array(rows * columns).fill(0);

  for (let baselineIndex = baseline.length - 1; baselineIndex >= 0; baselineIndex -= 1) {
    for (let currentIndex = current.length - 1; currentIndex >= 0; currentIndex -= 1) {
      const index = baselineIndex * columns + currentIndex;
      scores[index] =
        baseline[baselineIndex] === current[currentIndex]
          ? (scores[(baselineIndex + 1) * columns + currentIndex + 1] ?? 0) + 1
          : Math.max(
              scores[(baselineIndex + 1) * columns + currentIndex] ?? 0,
              scores[baselineIndex * columns + currentIndex + 1] ?? 0,
            );
    }
  }

  const ops: LineOp[] = [];
  let baselineIndex = 0;
  let currentIndex = 0;

  while (baselineIndex < baseline.length && currentIndex < current.length) {
    if (baseline[baselineIndex] === current[currentIndex]) {
      ops.push({ type: "equal", baselineIndex, currentIndex });
      baselineIndex += 1;
      currentIndex += 1;
      continue;
    }

    const deleteScore =
      scores[(baselineIndex + 1) * columns + currentIndex] ?? 0;
    const insertScore =
      scores[baselineIndex * columns + currentIndex + 1] ?? 0;
    if (deleteScore >= insertScore) {
      ops.push({ type: "delete", baselineIndex, currentIndex });
      baselineIndex += 1;
      continue;
    }

    ops.push({ type: "insert", baselineIndex, currentIndex });
    currentIndex += 1;
  }

  while (baselineIndex < baseline.length) {
    ops.push({ type: "delete", baselineIndex, currentIndex });
    baselineIndex += 1;
  }

  while (currentIndex < current.length) {
    ops.push({ type: "insert", baselineIndex, currentIndex });
    currentIndex += 1;
  }

  return ops;
}

function hunksFromOps(ops: readonly LineOp[]): SessionChangeHunk[] {
  const hunks: SessionChangeHunk[] = [];
  let index = 0;

  while (index < ops.length) {
    if (ops[index]?.type === "equal") {
      index += 1;
      continue;
    }

    let baselineStart = 0;
    let baselineCount = 0;
    let currentStart = 0;
    let currentCount = 0;

    while (index < ops.length && ops[index]?.type !== "equal") {
      const op = ops[index];
      if (!op) {
        break;
      }

      if (op.type === "delete") {
        if (baselineCount === 0) {
          baselineStart = op.baselineIndex + 1;
        }
        baselineCount += 1;
        if (currentCount === 0) {
          currentStart = op.currentIndex + 1;
        }
      } else if (op.type === "insert") {
        if (currentCount === 0) {
          currentStart = op.currentIndex + 1;
        }
        currentCount += 1;
        if (baselineCount === 0) {
          baselineStart = op.baselineIndex + 1;
        }
      }

      index += 1;
    }

    const kind: SessionChangeKind =
      baselineCount === 0 ? "insert" : currentCount === 0 ? "delete" : "modify";
    const hunk = {
      kind,
      baselineStart,
      baselineCount,
      currentStart,
      currentCount,
    };
    hunks.push({ ...hunk, id: hunkId(hunk) });
  }

  return hunks;
}

interface EditNode {
  kind: "line" | "hidden";
  viewIndex: number;
  viewCount: number;
  workingLines: number[];
  hunkId: string | null;
  beforeViewIndex: number;
}

function buildEditNodes(
  lines: readonly SessionViewLine[],
  hidden: readonly HiddenWorkingSpan[],
): EditNode[] {
  const hiddenByIndex = new Map<number, HiddenWorkingSpan[]>();
  for (const span of hidden) {
    const list = hiddenByIndex.get(span.beforeViewIndex) ?? [];
    list.push(span);
    hiddenByIndex.set(span.beforeViewIndex, list);
  }

  const nodes: EditNode[] = [];
  let viewIndex = 0;

  const pushHidden = (beforeViewIndex: number): void => {
    for (const span of hiddenByIndex.get(beforeViewIndex) ?? []) {
      nodes.push({
        kind: "hidden",
        viewIndex: beforeViewIndex,
        viewCount: 0,
        workingLines: span.workingLines,
        hunkId: span.hunkId,
        beforeViewIndex,
      });
    }
  };

  while (viewIndex < lines.length) {
    pushHidden(viewIndex);
    const line = lines[viewIndex];
    if (!line) {
      break;
    }

    if (line.groupId) {
      const start = viewIndex;
      const groupId = line.groupId;
      while (viewIndex < lines.length && lines[viewIndex]?.groupId === groupId) {
        viewIndex += 1;
      }
      nodes.push({
        kind: "line",
        viewIndex: start,
        viewCount: viewIndex - start,
        workingLines: line.workingLines,
        hunkId: line.hunkId,
        beforeViewIndex: start,
      });
      continue;
    }

    nodes.push({
      kind: "line",
      viewIndex,
      viewCount: 1,
      workingLines: line.workingLines,
      hunkId: line.hunkId,
      beforeViewIndex: viewIndex,
    });
    viewIndex += 1;
  }

  pushHidden(lines.length);
  return nodes;
}

function lastOverlappingIndex(
  nodes: readonly EditNode[],
  start: EditNode,
  changed: { prefix: number; oldEnd: number },
): number {
  let end = nodes.indexOf(start);
  while (end + 1 < nodes.length) {
    const next = nodes[end + 1];
    if (!next) {
      break;
    }
    if (next.kind === "hidden") {
      const inside =
        next.beforeViewIndex > changed.prefix &&
        next.beforeViewIndex < changed.oldEnd;
      if (!inside) {
        break;
      }
      end += 1;
      continue;
    }
    const overlaps =
      next.viewIndex < changed.oldEnd &&
      next.viewIndex + next.viewCount > changed.prefix;
    if (!overlaps) {
      break;
    }
    end += 1;
  }
  return end;
}

function emitWorking(
  result: string[],
  workingLines: readonly string[],
  owned: readonly number[],
): void {
  for (const lineNumber of owned) {
    result.push(workingLines[lineNumber - 1] ?? "");
  }
}

function findChangedLineSpan(
  previousLines: readonly string[],
  nextLines: readonly string[],
): { prefix: number; oldEnd: number; newEnd: number } {
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

  return {
    prefix,
    oldEnd: prefix + Math.max(0, previousSuffix - prefix + 1),
    newEnd: prefix + Math.max(0, nextSuffix - prefix + 1),
  };
}

function lineStartOffset(lines: readonly string[], lineNumber: number): number {
  let offset = 0;
  for (let index = 0; index < lineNumber - 1; index += 1) {
    offset += (lines[index]?.length ?? 0) + 1;
  }
  return offset;
}

function endOfWorkingLines(
  lines: readonly string[],
  owned: readonly number[],
  fallback: number,
): number {
  const last = owned[owned.length - 1];
  if (!last) {
    return fallback;
  }
  return lineStartOffset(lines, last) + (lines[last - 1]?.length ?? 0);
}

function viewChunkLength(
  lines: readonly SessionViewLine[],
  start: number,
  count: number,
): number {
  let length = 0;
  for (let offset = 0; offset < count; offset += 1) {
    length += lines[start + offset]?.text.length ?? 0;
    if (offset > 0) {
      length += 1;
    }
  }
  return length;
}
