import type { DiagramFormat } from "@/constants/diagram-formats";
import { WATERFALL_EXPECTED_COLUMNS } from "../constants";
import {
  formatCleanNumber,
  isBareEqualsCell,
  isExplicitAbsoluteCell,
  isNumericCell,
  parseTableNumber,
  shouldSkipHeaderRow,
} from "../parse-clipboard-grid";
import {
  makeTablePasteError,
  replaceDataLinesInSource,
} from "../replace-data-section";
import type { ParsedClipboardGrid, TablePasteResult } from "../types";

function isWaterfallValueCandidate(cell: string): boolean {
  const trimmed = cell.trim();
  return (
    trimmed === "" ||
    isBareEqualsCell(trimmed) ||
    isNumericCell(trimmed)
  );
}

function detectWaterfallColumns(
  rows: readonly (readonly string[])[],
): { labelCol: number; valueCol: number } | null {
  // Check if col 1 is value column (most common: Label | Value)
  const col1HasNumbers = rows.some((r) => isNumericCell(r[1] ?? ""));
  const col1AllValueCandidates = rows
    .slice(1)
    .every((r) => isWaterfallValueCandidate(r[1] ?? ""));
  const col0HasText = rows.some(
    (r) => (r[0] ?? "").trim().length > 0 && !isNumericCell(r[0] ?? ""),
  );

  // Check if col 0 is value column (Value | Label)
  const col0HasNumbers = rows.some((r) => isNumericCell(r[0] ?? ""));
  const col0AllValueCandidates = rows
    .slice(1)
    .every((r) => isWaterfallValueCandidate(r[0] ?? ""));
  const col1HasText = rows.some(
    (r) => (r[1] ?? "").trim().length > 0 && !isNumericCell(r[1] ?? ""),
  );

  if (col1HasNumbers && col1AllValueCandidates && col0HasText) {
    return { labelCol: 0, valueCol: 1 };
  }

  if (col0HasNumbers && col0AllValueCandidates && col1HasText) {
    return { labelCol: 1, valueCol: 0 };
  }

  // Fallback when all labels happen to be numeric-looking (e.g. years 2024, 2025)
  if (col1HasNumbers && col1AllValueCandidates) {
    return { labelCol: 0, valueCol: 1 };
  }

  if (col0HasNumbers && col0AllValueCandidates) {
    return { labelCol: 1, valueCol: 0 };
  }

  return null;
}

export function parseWaterfallTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount > WATERFALL_EXPECTED_COLUMNS) {
    return makeTablePasteError(
      "waterfall",
      format,
      "too_many_columns",
      "tablePaste.error.tooManyColumns",
      { expected: WATERFALL_EXPECTED_COLUMNS, actual: grid.colCount },
    );
  }

  if (grid.colCount < WATERFALL_EXPECTED_COLUMNS) {
    return makeTablePasteError(
      "waterfall",
      format,
      "too_few_columns",
      "tablePaste.error.tooFewColumns",
      { expected: WATERFALL_EXPECTED_COLUMNS, actual: grid.colCount },
    );
  }

  const detectedCols = detectWaterfallColumns(grid.rows);
  if (!detectedCols) {
    return makeTablePasteError(
      "waterfall",
      format,
      "ambiguous_columns",
      "tablePaste.error.waterfallColumns",
    );
  }

  const { labelCol, valueCol } = detectedCols;
  const skipHeader = shouldSkipHeaderRow(grid.rows, [valueCol]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;

  if (dataRows.length === 0) {
    return makeTablePasteError(
      "waterfall",
      format,
      "no_valid_rows",
      "tablePaste.error.noDataRows",
    );
  }

  const generatedLines: string[] = [];
  let hasEmittedStartingAbsolute = false;

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const label = (row[labelCol] ?? "").trim();
    const rawVal = (row[valueCol] ?? "").trim();

    if (!label && !rawVal) {
      continue;
    }

    if (rawVal === "" || isBareEqualsCell(rawVal)) {
      if (!hasEmittedStartingAbsolute) {
        return makeTablePasteError(
          "waterfall",
          format,
          "no_starting_value",
          "tablePaste.error.waterfallFirstMustBeNumber",
          { row: rowNum },
        );
      }
      generatedLines.push(`= : ${label}`);
      continue;
    }

    const num = parseTableNumber(rawVal);
    if (num === null) {
      return makeTablePasteError(
        "waterfall",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: rawVal },
      );
    }

    const formattedNum = formatCleanNumber(num);

    if (!hasEmittedStartingAbsolute || isExplicitAbsoluteCell(rawVal)) {
      hasEmittedStartingAbsolute = true;
      generatedLines.push(`=${formattedNum} : ${label}`);
      continue;
    }

    if (num >= 0) {
      generatedLines.push(`+${formattedNum} : ${label}`);
    } else {
      generatedLines.push(`${formattedNum} : ${label}`);
    }
  }

  if (generatedLines.length === 0 || !hasEmittedStartingAbsolute) {
    return makeTablePasteError(
      "waterfall",
      format,
      "no_starting_value",
      "tablePaste.error.noDataRows",
    );
  }

  // Replace existing waterfall data lines (=..., +..., -..., series ...)
  const result = replaceDataLinesInSource(
    source,
    "waterfall",
    generatedLines,
    (trimmed) =>
      /^[=+-](?:\s*-?\d|\s*:)/.test(trimmed) || /^series\b/i.test(trimmed),
    "waterfall",
  );

  if (result.ok) {
    // Also strip explicit `y "..." min --> max` hard limits if the new values might exceed them,
    // or keep user directives intact. The waterfall parser auto-scales if `y` is absent,
    // and if `y` is present we adjust its min/max if needed so bars are never clipped!
    return adjustWaterfallAxisIfNeeded(result);
  }

  return result;
}

function adjustWaterfallAxisIfNeeded(result: Extract<TablePasteResult, { ok: true }>): TablePasteResult {
  const lines = result.fullSource.split(/\r?\n/);
  let running = 0;
  let minVal = 0;
  let maxVal = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = /^([=+-])\s*(-?\d+(?:\.\d+)?)?\s*:/.exec(trimmed);
    if (!match) continue;
    const sign = match[1];
    const num = match[2] !== undefined ? Number(match[2]) : null;
    if (sign === "=") {
      if (num !== null) running = num;
    } else if (sign === "+" && num !== null) {
      running += num;
    } else if (sign === "-" && num !== null) {
      running -= Math.abs(num);
    }
    minVal = Math.min(minVal, running);
    maxVal = Math.max(maxVal, running);
  }

  const adjustedLines = lines.map((line) => {
    const axisMatch = /^(\s*y\s+(?:"[^"]*"\s+)?)(-?\d+(?:\.\d+)?)\s*-->\s*(-?\d+(?:\.\d+)?)(.*)$/i.exec(line);
    if (!axisMatch) return line;
    const curMin = Number(axisMatch[2]);
    const curMax = Number(axisMatch[3]);
    const nextMin = Math.min(curMin, minVal);
    const nextMax = maxVal > curMax ? Math.ceil(maxVal * 1.1) : curMax;
    if (nextMin !== curMin || nextMax !== curMax) {
      return `${axisMatch[1]}${nextMin} --> ${nextMax}${axisMatch[4]}`;
    }
    return line;
  });

  return {
    ...result,
    fullSource: adjustedLines.join("\n"),
  };
}
