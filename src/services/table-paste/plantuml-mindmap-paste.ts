import type { TablePasteResult, TablePasteReplaceRange } from "./types";

const MINDMAP_START_TAG = "@startmindmap";
const MINDMAP_END_TAG = "@endmindmap";

const MINDMAP_START_PATTERN = /^@startmindmap\b/i;
const MINDMAP_END_PATTERN = /^@endmindmap\b/i;
const LEGEND_START_PATTERN = /^legend\b/i;
const LEGEND_END_PATTERN = /^end\s*legend\b/i;
const STYLE_START_PATTERN = /^<style\b/i;
const STYLE_END_PATTERN = /^<\/style\b/i;
const NODE_LINE_PATTERN = /^[*+-]+(?:\[[^\]]*\])?_?(?:$|\s|:)/;
const MULTILINE_OPENER_PATTERN = /^[*+-]+(?:\[[^\]]*\])?_?\s*:/;
const STRUCTURAL_BREAK_PATTERN =
  /^(?:@endmindmap\b|legend\b|end\s*legend\b|<style\b|<\/style\b|title\b|header\b|footer\b|caption\b|left\s+side\b|right\s+side\b|skinparam\b|scale\b|hide\b|top\s+to\s+bottom\s+direction\b|left\s+to\s+right\s+direction\b|\/'|')/i;

type MindmapRegion = "outside" | "diagram" | "legend" | "style" | "multiline";

interface LineSpan {
  text: string;
  start: number;
  contentEnd: number;
  end: number;
  region: MindmapRegion;
  dropAsNode: boolean;
}

interface ProtectedRange {
  start: number;
  end: number;
}

interface AnalyzedMindmap {
  lines: LineSpan[];
  protectedRanges: ProtectedRange[];
  diagramStart: number;
  diagramEnd: number;
  hasStartTag: boolean;
}

function snippetNodeLines(snippet: string): string[] {
  return snippet
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

function isNodeLine(trimmed: string): boolean {
  return trimmed.length > 0 && NODE_LINE_PATTERN.test(trimmed);
}

function opensMultilineNode(trimmed: string): boolean {
  return MULTILINE_OPENER_PATTERN.test(trimmed) && !trimmed.endsWith(";");
}

function closesMultilineNode(trimmed: string): boolean {
  return trimmed === ";" || trimmed.endsWith(";");
}

function splitSourceLines(source: string): Array<Omit<LineSpan, "region" | "dropAsNode">> {
  const spans: Array<Omit<LineSpan, "region" | "dropAsNode">> = [];
  let start = 0;

  for (let index = 0; index <= source.length; index += 1) {
    if (index !== source.length && source[index] !== "\n") {
      continue;
    }

    let contentEnd = index;
    if (contentEnd > start && source[contentEnd - 1] === "\r") {
      contentEnd -= 1;
    }

    spans.push({
      text: source.slice(start, contentEnd),
      start,
      contentEnd,
      end: index === source.length ? source.length : index + 1,
    });
    start = index + 1;

    if (index === source.length) {
      break;
    }
  }

  return spans;
}

function analyzePlantUmlMindmap(source: string): AnalyzedMindmap {
  const spans = splitSourceLines(source);
  const lines: LineSpan[] = [];
  const protectedRanges: ProtectedRange[] = [];
  let region: MindmapRegion = "outside";
  let blockStart = -1;
  let diagramStart = source.length;
  let diagramEnd = source.length;
  let hasStartTag = false;

  const closeBlock = (end: number): void => {
    if (blockStart < 0) {
      return;
    }
    protectedRanges.push({ start: blockStart, end });
    blockStart = -1;
  };

  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index];
    const trimmed = span.text.trim();

    if (region === "multiline") {
      const structuralBreak =
        trimmed.length > 0 &&
        STRUCTURAL_BREAK_PATTERN.test(trimmed) &&
        !closesMultilineNode(trimmed);
      if (structuralBreak) {
        closeBlock(span.start);
        region = "diagram";
        index -= 1;
        continue;
      }

      lines.push({ ...span, region, dropAsNode: true });
      if (closesMultilineNode(trimmed)) {
        closeBlock(span.end);
        region = "diagram";
      }
      continue;
    }

    if (region === "legend" || region === "style") {
      if (MINDMAP_END_PATTERN.test(trimmed)) {
        closeBlock(span.start);
        region = "diagram";
        index -= 1;
        continue;
      }
      lines.push({ ...span, region, dropAsNode: false });
      const closed =
        (region === "legend" && LEGEND_END_PATTERN.test(trimmed)) ||
        (region === "style" && STYLE_END_PATTERN.test(trimmed));
      if (closed) {
        closeBlock(span.end);
        region = "diagram";
      }
      continue;
    }

    if (region === "outside") {
      lines.push({ ...span, region, dropAsNode: false });
      if (MINDMAP_START_PATTERN.test(trimmed)) {
        hasStartTag = true;
        region = "diagram";
        diagramStart = span.end;
      }
      continue;
    }

    if (MINDMAP_END_PATTERN.test(trimmed)) {
      diagramEnd = span.start;
      lines.push({ ...span, region: "outside", dropAsNode: false });
      region = "outside";
      continue;
    }

    if (LEGEND_START_PATTERN.test(trimmed)) {
      blockStart = span.start;
      region = "legend";
      lines.push({ ...span, region, dropAsNode: false });
      continue;
    }

    if (STYLE_START_PATTERN.test(trimmed)) {
      blockStart = span.start;
      region = "style";
      lines.push({ ...span, region, dropAsNode: false });
      continue;
    }

    if (isNodeLine(trimmed)) {
      const multiline = opensMultilineNode(trimmed);
      if (multiline) {
        blockStart = span.start;
        region = "multiline";
      }
      lines.push({
        ...span,
        region: multiline ? "multiline" : "diagram",
        dropAsNode: true,
      });
      continue;
    }

    lines.push({ ...span, region: "diagram", dropAsNode: false });
  }

  if (blockStart >= 0) {
    closeBlock(diagramEnd);
  }

  return { lines, protectedRanges, diagramStart, diagramEnd, hasStartTag };
}

function isLineBoundary(source: string, offset: number): boolean {
  if (offset === 0 || offset === source.length) {
    return true;
  }
  return source[offset] === "\n" || source[offset - 1] === "\n";
}

function isBlankLineOffset(source: string, offset: number): boolean {
  const lineStart = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const nextBreak = source.indexOf("\n", offset);
  const lineEnd = nextBreak === -1 ? source.length : nextBreak;
  return source.slice(lineStart, lineEnd).trim().length === 0;
}

function isSafeCursorInsert(
  source: string,
  offset: number,
  analysis: AnalyzedMindmap,
): boolean {
  if (!analysis.hasStartTag || !Number.isInteger(offset)) {
    return false;
  }
  if (offset < analysis.diagramStart || offset > analysis.diagramEnd) {
    return false;
  }
  if (!isLineBoundary(source, offset)) {
    return false;
  }
  const insideProtected = analysis.protectedRanges.some(
    (range) => offset > range.start && offset < range.end,
  );
  if (insideProtected) {
    return false;
  }
  return offset === analysis.diagramEnd || isBlankLineOffset(source, offset);
}

function selectionCoversEntireSource(
  source: string,
  range: TablePasteReplaceRange,
): boolean {
  const leadingWhitespace = source.length - source.trimStart().length;
  const contentEnd = source.trimEnd().length;
  return range.start <= leadingWhitespace && range.end >= contentEnd;
}

function spliceSnippet(
  source: string,
  start: number,
  end: number,
  nodeLines: readonly string[],
): string {
  const before = source.slice(0, start);
  const after = source.slice(end);
  let body = nodeLines.join("\n");

  if (before.length > 0 && !before.endsWith("\n")) {
    body = `\n${body}`;
  }
  if (after.length > 0 && !after.startsWith("\n")) {
    body = `${body}\n`;
  }
  if (after.length === 0 && source.endsWith("\n") && !body.endsWith("\n")) {
    body = `${body}\n`;
  }

  return `${before}${body}${after}`;
}

function replaceMindmapNodes(source: string, nodeLines: readonly string[]): string {
  if (!source.trim()) {
    return `${MINDMAP_START_TAG}\n${nodeLines.join("\n")}\n${MINDMAP_END_TAG}`;
  }

  const analysis = analyzePlantUmlMindmap(source);
  const hasNode = analysis.lines.some((line) => line.dropAsNode);
  if (!hasNode) {
    const endOffset = analysis.hasStartTag ? analysis.diagramEnd : source.length;
    return spliceSnippet(source, endOffset, endOffset, nodeLines);
  }

  const kept: string[] = [];
  let inserted = false;
  for (const line of analysis.lines) {
    if (line.dropAsNode) {
      if (!inserted) {
        kept.push(...nodeLines);
        inserted = true;
      }
      continue;
    }
    kept.push(line.text);
  }

  return kept.join("\n");
}

/**
 * Places a generated PlantUML mindmap tree without tearing legend, style,
 * title/header/footer/caption, or other non-node lines.
 *
 * - Partial selection is replaced with the new nodes.
 * - A caret on a blank line inside the map (or just before @endmindmap)
 *   inserts the nodes there.
 * - Otherwise every existing node, including multiline bodies, is replaced
 *   and the surrounding code stays in place.
 * - A selection of the whole buffer uses the node-preserving replace, so
 *   @startmindmap / @endmindmap and legend survive.
 */
export function applyPlantUmlMindmapPlacement(input: {
  source: string;
  snippet: string;
  selectionRange?: TablePasteReplaceRange;
  cursorOffset?: number;
}): TablePasteResult {
  const nodeLines = snippetNodeLines(input.snippet);
  const snippet = nodeLines.join("\n");
  const selection = input.selectionRange;
  const analysis = analyzePlantUmlMindmap(input.source);

  let fullSource: string;
  let replaceRange: TablePasteReplaceRange;

  if (selection && selection.end > selection.start) {
    if (selectionCoversEntireSource(input.source, selection)) {
      fullSource = replaceMindmapNodes(input.source, nodeLines);
      replaceRange = { start: 0, end: input.source.length };
    } else {
      fullSource = spliceSnippet(
        input.source,
        selection.start,
        selection.end,
        nodeLines,
      );
      replaceRange = selection;
    }
  } else if (
    typeof input.cursorOffset === "number" &&
    isSafeCursorInsert(input.source, input.cursorOffset, analysis)
  ) {
    fullSource = spliceSnippet(
      input.source,
      input.cursorOffset,
      input.cursorOffset,
      nodeLines,
    );
    replaceRange = { start: input.cursorOffset, end: input.cursorOffset };
  } else {
    fullSource = replaceMindmapNodes(input.source, nodeLines);
    replaceRange = { start: 0, end: input.source.length };
  }

  return {
    ok: true,
    snippet,
    fullSource,
    replaceRange,
    diagramType: "mindmap",
  };
}
