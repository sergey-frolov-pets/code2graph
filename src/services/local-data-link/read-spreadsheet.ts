import { readSheet, SheetNotFoundError } from "read-excel-file/browser";
import { parseCsv } from "@/services/local-data-link/parse-csv";
import {
  gridToTsv,
  parseSheetRange,
  sliceSheetGrid,
} from "@/services/local-data-link/sheet-range";

export type DataLinkReadCode =
  | "bad_range"
  | "empty"
  | "sheet_missing"
  | "read_failed";

export class DataLinkReadError extends Error {
  readonly sheet: string | undefined;

  constructor(
    readonly code: DataLinkReadCode,
    sheet?: string,
  ) {
    super(code);
    this.sheet = sheet;
  }
}

function isCsvFile(file: File): boolean {
  return /\.csv$/i.test(file.name) || file.type === "text/csv";
}

export async function readSpreadsheetFileToTsv(
  file: File,
  rangeText: string,
  untilEmptyRow: boolean,
): Promise<string> {
  const range = parseSheetRange(rangeText);
  if (!range) {
    throw new DataLinkReadError("bad_range");
  }

  let grid: readonly (readonly unknown[])[];
  try {
    if (isCsvFile(file)) {
      grid = parseCsv(await file.text());
    } else {
      grid = await readSheet(file, range.sheet ?? 1, { trim: false });
    }
  } catch (error) {
    if (error instanceof SheetNotFoundError) {
      throw new DataLinkReadError(
        "sheet_missing",
        typeof error.sheet === "string" ? error.sheet : range.sheet ?? "",
      );
    }
    throw new DataLinkReadError("read_failed");
  }

  const sliced = sliceSheetGrid(grid, range, untilEmptyRow);
  if (sliced.length === 0 || sliced.every((row) => row.every((cell) => cell.trim() === ""))) {
    throw new DataLinkReadError("empty");
  }
  return gridToTsv(sliced);
}
