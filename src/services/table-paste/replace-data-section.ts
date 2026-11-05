import type { DiagramFormat } from "@/constants/diagram-formats";
import type { LocaleKey } from "@/locales/types";
import { getTablePasteExpectedSpec } from "./constants";
import type {
  TablePasteDiagramType,
  TablePasteErrorCode,
  TablePasteResult,
} from "./types";

export function makeTablePasteError(
  diagramType: TablePasteDiagramType,
  format: DiagramFormat,
  code: TablePasteErrorCode,
  reasonKey: LocaleKey,
  reasonParams?: Record<string, string | number>,
): TablePasteResult {
  return {
    ok: false,
    error: {
      code,
      reasonKey,
      reasonParams,
      diagramType,
      format,
      expected: getTablePasteExpectedSpec(diagramType, format),
    },
  };
}

/**
 * Replaces lines in `source` matching `isDataLine` with `newDataLines`,
 * or appends `newDataLines` before any closing `@end*` tag (or at the end).
 */
export function replaceDataLinesInSource(
  source: string,
  diagramType: TablePasteDiagramType,
  newDataLines: readonly string[],
  isDataLine: (trimmedLine: string, lineIndex: number, allLines: readonly string[]) => boolean,
  defaultHeader?: string,
): TablePasteResult {
  const snippet = newDataLines.join("\n");
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    const fullSource = defaultHeader
      ? `${defaultHeader}\n${snippet}`
      : snippet;
    return {
      ok: true,
      snippet,
      fullSource,
      replaceRange: { start: 0, end: source.length },
      diagramType,
    };
  }

  const lines = source.split(/\r?\n/);
  const keptBefore: string[] = [];
  const keptAfter: string[] = [];
  let seenFirstDataLine = false;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (isDataLine(trimmed, i, lines)) {
      seenFirstDataLine = true;
      continue;
    }

    if (!seenFirstDataLine) {
      keptBefore.push(rawLine);
    } else {
      keptAfter.push(rawLine);
    }
  }

  if (seenFirstDataLine) {
    const fullLines = [...keptBefore, ...newDataLines, ...keptAfter];
    const fullSource = fullLines.join("\n");
    return {
      ok: true,
      snippet,
      fullSource,
      replaceRange: { start: 0, end: source.length },
      diagramType,
    };
  }

  // If no existing data lines were found, insert before @end* if present, otherwise at the end
  const endTagIdx = lines.findIndex((line) => /^@end/i.test(line.trim()));
  if (endTagIdx >= 0) {
    const fullLines = [
      ...lines.slice(0, endTagIdx),
      ...newDataLines,
      ...lines.slice(endTagIdx),
    ];
    return {
      ok: true,
      snippet,
      fullSource: fullLines.join("\n"),
      replaceRange: { start: 0, end: source.length },
      diagramType,
    };
  }

  const fullSource = `${source.trimEnd()}\n${snippet}`;
  return {
    ok: true,
    snippet,
    fullSource,
    replaceRange: { start: 0, end: source.length },
    diagramType,
  };
}
