import {
  parseClipboardGrid,
  parseSingleColumnClipboard,
} from "@/services/table-paste/parse-clipboard-grid";
import type { ParsedClipboardGrid } from "@/services/table-paste/types";

const TSV_COLUMN_DELIMITER = "\t";
const TSV_ROW_DELIMITER = "\n";

export interface SerializeGridToTsvOptions {
  includeHeaders?: boolean;
  headers?: readonly string[];
}

function sanitizeClipboardCell(value: string): string {
  return String(value ?? "")
    .replace(/[\t\r\n]+/g, " ")
    .trim();
}

export function serializeGridToClipboardTsv(
  rows: readonly (readonly string[])[],
  options: SerializeGridToTsvOptions = {},
): string {
  const outputLines: string[] = [];

  if (
    options.includeHeaders &&
    options.headers &&
    options.headers.length > 0
  ) {
    outputLines.push(
      options.headers.map(sanitizeClipboardCell).join(TSV_COLUMN_DELIMITER),
    );
  }

  for (const row of rows) {
    outputLines.push(
      row.map(sanitizeClipboardCell).join(TSV_COLUMN_DELIMITER),
    );
  }

  return outputLines.join(TSV_ROW_DELIMITER);
}

export function parseRawTextToGrid(
  rawClipboardText: string,
  allowSingleColumn = false,
): ParsedClipboardGrid | null {
  const grid = parseClipboardGrid(rawClipboardText);
  if (grid) {
    return grid;
  }

  if (allowSingleColumn) {
    return parseSingleColumnClipboard(rawClipboardText);
  }

  return null;
}

export function transposeMatrixData(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): { headers: string[]; rows: string[][] } {
  if (rows.length === 0) {
    return {
      headers: [...headers],
      rows: [],
    };
  }

  const newHeaders = rows.map(
    (row, index) => (row[0] ?? "").trim() || `Col ${index + 1}`,
  );
  const newRows: string[][] = headers.map((colTitle, colIndex) => {
    const values = rows.map((row) => (row[colIndex + 1] ?? "").trim());
    return [colTitle, ...values];
  });

  return {
    headers: newHeaders,
    rows: newRows,
  };
}
