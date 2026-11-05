import type { ParsedClipboardGrid } from "./types";

const NUMBER_TOKEN_RE = /^[=+-]?\s*\d[\d\s_]*(?:[.,]\d+)?\s*%?$/;

export function parseTableNumber(raw: string): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || !NUMBER_TOKEN_RE.test(trimmed)) {
    return null;
  }

  const withoutPrefix = trimmed.replace(/^=/, "").replace(/%$/, "").trim();
  const normalized = withoutPrefix.replace(/[\s_]/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function isNumericCell(raw: string): boolean {
  return parseTableNumber(raw) !== null;
}

export function isExplicitAbsoluteCell(raw: string): boolean {
  const trimmed = String(raw ?? "").trim();
  return trimmed.startsWith("=") && parseTableNumber(trimmed) !== null;
}

export function isBareEqualsCell(raw: string): boolean {
  return String(raw ?? "").trim() === "=";
}

export function formatCleanNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const rounded = Math.round(value * 10000) / 10000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function unquoteClipboardCell(cell: string): string {
  const trimmed = cell.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"').trim();
  }
  return trimmed;
}

function isMarkdownDividerRow(cells: readonly string[]): boolean {
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()))
  );
}

function splitMarkdownPipeRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    return null;
  }
  const inner = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const parts = inner.split("|").map((item) => unquoteClipboardCell(item));
  return parts.length >= 2 ? parts : null;
}

function detectDelimiter(lines: readonly string[]): "\t" | "pipe" | ";" | null {
  const hasTabs = lines.some((line) => line.includes("\t"));
  if (hasTabs) {
    return "\t";
  }

  const pipeRows = lines
    .map((line) => splitMarkdownPipeRow(line))
    .filter((row): row is string[] => row !== null);
  if (pipeRows.length === lines.length && pipeRows.length >= 1) {
    return "pipe";
  }

  const semicolonCounts = lines.map((line) => line.split(";").length);
  if (
    semicolonCounts.length >= 1 &&
    semicolonCounts[0] >= 2 &&
    semicolonCounts.every((count) => count === semicolonCounts[0])
  ) {
    return ";";
  }

  return null;
}

export function parseClipboardGrid(rawClipboardText: string): ParsedClipboardGrid | null {
  const normalizedText = String(rawClipboardText ?? "").replace(/\r\n?/g, "\n");
  const nonEmptyLines = normalizedText
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return null;
  }

  const delimiter = detectDelimiter(nonEmptyLines);
  if (!delimiter) {
    return null;
  }

  const rawRows: string[][] = [];
  for (const line of nonEmptyLines) {
    if (delimiter === "\t") {
      rawRows.push(line.split("\t").map((cell) => unquoteClipboardCell(cell)));
      continue;
    }

    if (delimiter === "pipe") {
      const cells = splitMarkdownPipeRow(line);
      if (!cells) {
        return null;
      }
      if (isMarkdownDividerRow(cells)) {
        continue;
      }
      rawRows.push(cells);
      continue;
    }

    rawRows.push(line.split(";").map((cell) => unquoteClipboardCell(cell)));
  }

  const filteredRows = rawRows.filter((row) =>
    row.some((cell) => cell.trim().length > 0),
  );
  if (filteredRows.length === 0) {
    return null;
  }

  const maxCols = Math.max(...filteredRows.map((row) => row.length));
  if (maxCols < 2) {
    return null;
  }

  const normalizedRows = filteredRows.map((row) => {
    if (row.length === maxCols) {
      return row;
    }
    return [...row, ...Array.from({ length: maxCols - row.length }, () => "")];
  });

  // Drop trailing completely empty columns if Excel added trailing tabs
  let effectiveCols = maxCols;
  while (
    effectiveCols > 2 &&
    normalizedRows.every((row) => row[effectiveCols - 1].trim() === "")
  ) {
    effectiveCols -= 1;
  }

  const trimmedRows =
    effectiveCols === maxCols
      ? normalizedRows
      : normalizedRows.map((row) => row.slice(0, effectiveCols));

  return {
    rows: trimmedRows,
    rowCount: trimmedRows.length,
    colCount: effectiveCols,
  };
}

/**
 * Checks whether the first row is a header row because numeric columns
 * contain text in row 0 while subsequent rows contain numbers/empty cells.
 */
export function shouldSkipHeaderRow(
  rows: readonly (readonly string[])[],
  numericColIndices: readonly number[],
): boolean {
  if (rows.length < 2 || numericColIndices.length === 0) {
    return false;
  }

  const firstRow = rows[0];
  const restRows = rows.slice(1);

  const firstHasNonNumericInNumericCol = numericColIndices.some((colIdx) => {
    const cell = (firstRow[colIdx] ?? "").trim();
    return cell.length > 0 && !isNumericCell(cell) && !isBareEqualsCell(cell);
  });

  if (!firstHasNonNumericInNumericCol) {
    return false;
  }

  const restHasValidNumbers = restRows.some((row) =>
    numericColIndices.some((colIdx) => isNumericCell(row[colIdx] ?? "")),
  );

  return restHasValidNumbers;
}
