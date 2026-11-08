import { MAX_DATA_LINK_SCAN_ROWS } from "@/services/local-data-link/constants";

export interface ParsedSheetRange {
  sheet: string | null;
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

const RANGE_PATTERN =
  /^(?:(?:'((?:[^']|'')*)'|([^'!]+))!)?(\$?[A-Za-z]+)(\$?\d+)(?::(\$?[A-Za-z]+)(\$?\d+))?$/;

export function parseSheetRange(value: string): ParsedSheetRange | null {
  const match = value.trim().match(RANGE_PATTERN);
  if (!match) {
    return null;
  }

  const quotedSheet = match[1];
  const plainSheet = match[2];
  const startCol = columnIndex(match[3] ?? "");
  const startRow = rowIndex(match[4] ?? "");
  const endCol = match[5] ? columnIndex(match[5]) : startCol;
  const endRow = match[6] ? rowIndex(match[6]) : startRow;

  if (
    startCol == null ||
    startRow == null ||
    endCol == null ||
    endRow == null
  ) {
    return null;
  }

  const sheet = quotedSheet
    ? quotedSheet.replace(/''/g, "'")
    : plainSheet?.trim() || null;

  return {
    sheet: sheet && sheet.length > 0 ? sheet : null,
    startCol: Math.min(startCol, endCol),
    startRow: Math.min(startRow, endRow),
    endCol: Math.max(startCol, endCol),
    endRow: Math.max(startRow, endRow),
  };
}

export function columnIndex(letters: string): number | null {
  const normalized = letters.replace(/\$/g, "").toUpperCase();
  if (!/^[A-Z]+$/.test(normalized)) {
    return null;
  }

  let index = 0;
  for (const char of normalized) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index > 0 ? index : null;
}

function rowIndex(value: string): number | null {
  const row = Number(value.replace(/\$/g, ""));
  if (!Number.isInteger(row) || row < 1) {
    return null;
  }
  return row;
}

export function formatSheetCell(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;
    if (
      value.getHours() === 0 &&
      value.getMinutes() === 0 &&
      value.getSeconds() === 0
    ) {
      return date;
    }
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `${date} ${hours}:${minutes}`;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value).replace(/[\t\r\n]/g, " ");
}

export function isEmptySheetCell(value: unknown): boolean {
  return formatSheetCell(value).trim().length === 0;
}

function rowSlice(
  row: readonly unknown[] | undefined,
  startCol: number,
  endCol: number,
): string[] {
  const cells: string[] = [];
  for (let col = startCol; col <= endCol; col += 1) {
    cells.push(formatSheetCell(row?.[col - 1]));
  }
  return cells;
}

function isEmptySlice(cells: readonly string[]): boolean {
  return cells.every((cell) => cell.trim().length === 0);
}

export function sliceSheetGrid(
  rows: readonly (readonly unknown[])[],
  range: ParsedSheetRange,
  untilEmptyRow: boolean,
): string[][] {
  if (!untilEmptyRow) {
    const sliced: string[][] = [];
    for (let row = range.startRow; row <= range.endRow; row += 1) {
      sliced.push(rowSlice(rows[row - 1], range.startCol, range.endCol));
    }
    return sliced;
  }

  const sliced: string[][] = [];
  const lastRow = range.startRow + MAX_DATA_LINK_SCAN_ROWS - 1;
  for (let row = range.startRow; row <= lastRow; row += 1) {
    const cells = rowSlice(rows[row - 1], range.startCol, range.endCol);
    if (isEmptySlice(cells)) {
      break;
    }
    sliced.push(cells);
  }
  return sliced;
}

export function gridToTsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.join("\t")).join("\n");
}
