import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  BUBBLE_MAX_COLUMNS,
  BUBBLE_MIN_COLUMNS,
  EV_EXPECTED_COLUMNS,
  HEATMAP_MIN_COLUMNS,
  HEATMAP_MIN_ROWS,
  PERCENT_NORMALIZATION_DIVISOR,
  PIE_EXPECTED_COLUMNS,
  QUADRANT_EXPECTED_COLUMNS,
  SANKEY_EXPECTED_COLUMNS,
  XYCHART_MAX_COLUMNS,
  XYCHART_MIN_COLUMNS,
} from "../constants";
import {
  formatCleanNumber,
  isNumericCell,
  parseTableNumber,
  shouldSkipHeaderRow,
} from "../parse-clipboard-grid";
import {
  makeTablePasteError,
  replaceDataLinesInSource,
} from "../replace-data-section";
import type { ParsedClipboardGrid, TablePasteResult } from "../types";

// ---------------------------------------------------------------------------
// 1. PIE (Mermaid)
// ---------------------------------------------------------------------------
export function parsePieTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount !== PIE_EXPECTED_COLUMNS) {
    return makeTablePasteError(
      "pie",
      format,
      grid.colCount > PIE_EXPECTED_COLUMNS ? "too_many_columns" : "too_few_columns",
      grid.colCount > PIE_EXPECTED_COLUMNS
        ? "tablePaste.error.tooManyColumns"
        : "tablePaste.error.tooFewColumns",
      { expected: PIE_EXPECTED_COLUMNS, actual: grid.colCount },
    );
  }

  // Detect which column holds numbers (Label | Value or Value | Label)
  const col1NumericCount = grid.rows.filter((r) => isNumericCell(r[1] ?? "")).length;
  const col0NumericCount = grid.rows.filter((r) => isNumericCell(r[0] ?? "")).length;
  if (col1NumericCount === 0 && col0NumericCount === 0) {
    return makeTablePasteError(
      "pie",
      format,
      "ambiguous_columns",
      "tablePaste.error.noNumericColumn",
    );
  }

  const valueCol = col1NumericCount >= col0NumericCount ? 1 : 0;
  const labelCol = valueCol === 1 ? 0 : 1;

  const skipHeader = shouldSkipHeaderRow(grid.rows, [valueCol]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("pie", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const lines: string[] = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const label = (row[labelCol] ?? "").trim().replace(/"/g, "'");
    const rawVal = (row[valueCol] ?? "").trim();
    if (!label && !rawVal) continue;

    const num = parseTableNumber(rawVal);
    if (num === null) {
      return makeTablePasteError(
        "pie",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: rawVal },
      );
    }
    if (num < 0) {
      return makeTablePasteError(
        "pie",
        format,
        "negative_number_not_allowed",
        "tablePaste.error.negativeNotAllowedAtRow",
        { row: rowNum, value: rawVal },
      );
    }
    lines.push(`    "${label || `Item ${i + 1}`}" : ${formatCleanNumber(num)}`);
  }

  if (lines.length === 0) {
    return makeTablePasteError("pie", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  return replaceDataLinesInSource(
    source,
    "pie",
    lines,
    (trimmed) => /^"[^"]*"\s*:\s*[-+]?\d/.test(trimmed),
    "pie showData",
  );
}

// ---------------------------------------------------------------------------
// 2. HEATMAP (Mermaid Ext)
// ---------------------------------------------------------------------------
export function parseHeatmapTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < HEATMAP_MIN_COLUMNS) {
    return makeTablePasteError(
      "heatmap",
      format,
      "too_few_columns",
      "tablePaste.error.tooFewColumnsMin",
      { min: HEATMAP_MIN_COLUMNS, actual: grid.colCount },
    );
  }
  if (grid.rowCount < HEATMAP_MIN_ROWS) {
    return makeTablePasteError(
      "heatmap",
      format,
      "too_few_rows",
      "tablePaste.error.tooFewRowsMin",
      { min: HEATMAP_MIN_ROWS, actual: grid.rowCount },
    );
  }

  // Check if row 0 is column headers (x-axis)
  const firstRowCells = grid.rows[0].slice(1);
  const firstRowHasHeaderLabels = firstRowCells.some(
    (c) => c.trim().length > 0 && !isNumericCell(c),
  );

  const xLabels = firstRowHasHeaderLabels
    ? firstRowCells.map((c, idx) => c.trim() || `Col ${idx + 1}`)
    : Array.from({ length: grid.colCount - 1 }, (_, idx) => `Col ${idx + 1}`);

  const matrixRows = firstRowHasHeaderLabels ? grid.rows.slice(1) : grid.rows;
  if (matrixRows.length === 0) {
    return makeTablePasteError("heatmap", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const yLabels: string[] = [];
  const dataLines: string[] = [];

  for (let i = 0; i < matrixRows.length; i += 1) {
    const row = matrixRows[i];
    const rowNum = firstRowHasHeaderLabels ? i + 2 : i + 1;
    const rowLabel = (row[0] ?? "").trim() || `Row ${i + 1}`;
    const valueCells = row.slice(1, xLabels.length + 1);

    const formattedCells: string[] = [];
    for (const cell of valueCells) {
      const trimmed = cell.trim();
      if (!trimmed) {
        formattedCells.push("");
        continue;
      }
      const num = parseTableNumber(trimmed);
      if (num === null) {
        return makeTablePasteError(
          "heatmap",
          format,
          "invalid_number",
          "tablePaste.error.invalidNumberAtRow",
          { row: rowNum, value: trimmed },
        );
      }
      formattedCells.push(formatCleanNumber(num));
    }

    yLabels.push(rowLabel);
    dataLines.push(`${rowLabel} : ${formattedCells.join(", ")}`);
  }

  const formatAxisItem = (label: string): string =>
    label.includes(",") ? `"${label}"` : label;

  const newSectionLines = [
    `x ${xLabels.map(formatAxisItem).join(", ")}`,
    `y ${yLabels.map(formatAxisItem).join(", ")}`,
    "data",
    ...dataLines,
  ];

  // Keep title and scale block if present, replace x, y, and data block
  const lines = source.split(/\r?\n/);
  const keptLines: string[] = [];
  let inScale = false;
  let inData = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (/^scale$/i.test(trimmed)) {
      inScale = true;
      inData = false;
      keptLines.push(rawLine);
      continue;
    }
    if (/^data$/i.test(trimmed)) {
      inData = true;
      inScale = false;
      continue;
    }
    if (inScale) {
      if (/^end$/i.test(trimmed)) {
        inScale = false;
      }
      keptLines.push(rawLine);
      continue;
    }
    if (inData) {
      if (/^end$/i.test(trimmed)) {
        inData = false;
      }
      continue;
    }
    if (/^[xy]\b/i.test(trimmed)) {
      continue;
    }
    keptLines.push(rawLine);
  }

  const baseHeader =
    keptLines.filter((l) => l.trim().length > 0).length > 0
      ? keptLines.join("\n")
      : "heatmap";

  const fullSource = `${baseHeader}\n${newSectionLines.join("\n")}`;
  return {
    ok: true,
    snippet: newSectionLines.join("\n"),
    fullSource,
    replaceRange: { start: 0, end: source.length },
    diagramType: "heatmap",
  };
}

// ---------------------------------------------------------------------------
// 3. BUBBLE (Mermaid Ext)
// ---------------------------------------------------------------------------
export function parseBubbleTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < BUBBLE_MIN_COLUMNS || grid.colCount > BUBBLE_MAX_COLUMNS) {
    return makeTablePasteError(
      "bubble",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: BUBBLE_MIN_COLUMNS, max: BUBBLE_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader = shouldSkipHeaderRow(grid.rows, [1, 2, 3]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("bubble", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const pointLines: string[] = [];
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const label = (row[0] ?? "").trim() || `Point ${i + 1}`;
    const xNum = parseTableNumber(row[1] ?? "");
    const yNum = parseTableNumber(row[2] ?? "");
    const sizeNum = parseTableNumber(row[3] ?? "");
    const group = (row[4] ?? "").trim();

    if (xNum === null || yNum === null || sizeNum === null) {
      const badVal =
        xNum === null ? row[1] : yNum === null ? row[2] : row[3];
      return makeTablePasteError(
        "bubble",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: String(badVal ?? "").trim() },
      );
    }

    xValues.push(xNum);
    yValues.push(yNum);

    const groupSuffix = group ? `, group=${group}` : "";
    pointLines.push(
      `${label} : x=${formatCleanNumber(xNum)}, y=${formatCleanNumber(yNum)}, size=${formatCleanNumber(sizeNum)}${groupSuffix}`,
    );
  }

  const hasDataKeyword = /^\s*data\s*$/im.test(source);
  const newLines = hasDataKeyword ? pointLines : ["data", ...pointLines];

  const replaced = replaceDataLinesInSource(
    source,
    "bubble",
    newLines,
    (trimmed) => /^[^:\n]+\s*:\s*x\s*=/.test(trimmed),
    `bubble\nx "X" ${Math.min(0, ...xValues)} --> ${Math.ceil(Math.max(10, ...xValues) * 1.1)}\ny "Y" ${Math.min(0, ...yValues)} --> ${Math.ceil(Math.max(10, ...yValues) * 1.1)}`,
  );

  return replaced;
}

// ---------------------------------------------------------------------------
// 4. EV / Earned Value (Mermaid Ext)
// ---------------------------------------------------------------------------

/**
 * A series row always carries values (`days 1, 2`, `ev 8, 20`).
 * A bare `ev` (or `evchart`) is the diagram opener and must stay in place.
 */
const EV_SERIES_LINE_PATTERN = /^(?:days|pv|ev|ac)\b\s+\S/i;

function isEvSeriesLine(trimmed: string): boolean {
  return EV_SERIES_LINE_PATTERN.test(trimmed);
}

export function parseEvTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  // Check if transposed (4 rows: days, pv, ev, ac)
  if (
    grid.rowCount === EV_EXPECTED_COLUMNS &&
    /^(?:days?|период|день|дни)\b/i.test(grid.rows[0][0] ?? "") &&
    /^pv\b/i.test(grid.rows[1][0] ?? "") &&
    /^ev\b/i.test(grid.rows[2][0] ?? "") &&
    /^ac\b/i.test(grid.rows[3][0] ?? "")
  ) {
    const days = grid.rows[0].slice(1).map((c) => c.trim()).filter(Boolean);
    const pvVals: string[] = [];
    const evVals: string[] = [];
    const acVals: string[] = [];
    const targetArrays = [pvVals, evVals, acVals];

    for (let r = 1; r <= 3; r += 1) {
      for (let c = 1; c <= days.length; c += 1) {
        const cell = (grid.rows[r][c] ?? "").trim();
        const num = parseTableNumber(cell);
        if (num === null) {
          return makeTablePasteError(
            "ev",
            format,
            "invalid_number",
            "tablePaste.error.invalidNumberAtRow",
            { row: r + 1, value: cell },
          );
        }
        targetArrays[r - 1].push(formatCleanNumber(num));
      }
    }

    const evLines = [
      `days ${days.join(", ")}`,
      `pv ${pvVals.join(", ")}`,
      `ev ${evVals.join(", ")}`,
      `ac ${acVals.join(", ")}`,
    ];

    return replaceDataLinesInSource(
      source,
      "ev",
      evLines,
      isEvSeriesLine,
      "ev",
    );
  }

  if (grid.colCount !== EV_EXPECTED_COLUMNS) {
    return makeTablePasteError(
      "ev",
      format,
      grid.colCount > EV_EXPECTED_COLUMNS ? "too_many_columns" : "too_few_columns",
      grid.colCount > EV_EXPECTED_COLUMNS
        ? "tablePaste.error.tooManyColumns"
        : "tablePaste.error.tooFewColumns",
      { expected: EV_EXPECTED_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader = shouldSkipHeaderRow(grid.rows, [1, 2, 3]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("ev", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const days: string[] = [];
  const pv: string[] = [];
  const ev: string[] = [];
  const ac: string[] = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const dayLabel = (row[0] ?? "").trim() || String(i + 1);
    const pvNum = parseTableNumber(row[1] ?? "");
    const evNum = parseTableNumber(row[2] ?? "");
    const acNum = parseTableNumber(row[3] ?? "");

    if (pvNum === null || evNum === null || acNum === null) {
      const badVal = pvNum === null ? row[1] : evNum === null ? row[2] : row[3];
      return makeTablePasteError(
        "ev",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: String(badVal ?? "").trim() },
      );
    }

    days.push(dayLabel);
    pv.push(formatCleanNumber(pvNum));
    ev.push(formatCleanNumber(evNum));
    ac.push(formatCleanNumber(acNum));
  }

  const evLines = [
    `days ${days.join(", ")}`,
    `pv ${pv.join(", ")}`,
    `ev ${ev.join(", ")}`,
    `ac ${ac.join(", ")}`,
  ];

  return replaceDataLinesInSource(
    source,
    "ev",
    evLines,
    isEvSeriesLine,
    "ev",
  );
}

// ---------------------------------------------------------------------------
// 5. XYCHART (Mermaid xychart-beta)
// ---------------------------------------------------------------------------
export function parseXyChartTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < XYCHART_MIN_COLUMNS || grid.colCount > XYCHART_MAX_COLUMNS) {
    return makeTablePasteError(
      "xychart",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: XYCHART_MIN_COLUMNS, max: XYCHART_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  const numericCols = grid.colCount === 3 ? [1, 2] : [1];
  const skipHeader = shouldSkipHeaderRow(grid.rows, numericCols);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("xychart", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const xCategories: string[] = [];
  const barValues: string[] = [];
  const lineValues: string[] = [];
  const allNumbers: number[] = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const category = (row[0] ?? "").trim().replace(/"/g, "'") || `${i + 1}`;
    const barNum = parseTableNumber(row[1] ?? "");
    if (barNum === null) {
      return makeTablePasteError(
        "xychart",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: (row[1] ?? "").trim() },
      );
    }

    xCategories.push(`"${category}"`);
    barValues.push(formatCleanNumber(barNum));
    allNumbers.push(barNum);

    if (grid.colCount === 3) {
      const lineNum = parseTableNumber(row[2] ?? "");
      if (lineNum === null) {
        return makeTablePasteError(
          "xychart",
          format,
          "invalid_number",
          "tablePaste.error.invalidNumberAtRow",
          { row: rowNum, value: (row[2] ?? "").trim() },
        );
      }
      lineValues.push(formatCleanNumber(lineNum));
      allNumbers.push(lineNum);
    }
  }

  const minVal = Math.min(0, ...allNumbers);
  const maxVal = Math.ceil(Math.max(10, ...allNumbers) * 1.1);

  const generatedLines = [
    `    x-axis [${xCategories.join(", ")}]`,
    `    y-axis ${minVal} --> ${maxVal}`,
    `    bar [${barValues.join(", ")}]`,
  ];
  if (lineValues.length > 0) {
    generatedLines.push(`    line [${lineValues.join(", ")}]`);
  }

  return replaceDataLinesInSource(
    source,
    "xychart",
    generatedLines,
    (trimmed) => /^(?:x-axis|y-axis|bar|line)\b/i.test(trimmed),
    "xychart-beta",
  );
}

// ---------------------------------------------------------------------------
// 6. QUADRANT (Mermaid quadrantChart)
// ---------------------------------------------------------------------------
export function parseQuadrantTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount !== QUADRANT_EXPECTED_COLUMNS) {
    return makeTablePasteError(
      "quadrant",
      format,
      grid.colCount > QUADRANT_EXPECTED_COLUMNS ? "too_many_columns" : "too_few_columns",
      grid.colCount > QUADRANT_EXPECTED_COLUMNS
        ? "tablePaste.error.tooManyColumns"
        : "tablePaste.error.tooFewColumns",
      { expected: QUADRANT_EXPECTED_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader = shouldSkipHeaderRow(grid.rows, [1, 2]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("quadrant", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const parsedPoints: { label: string; x: number; y: number; rowNum: number }[] = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const label = (row[0] ?? "").trim().replace(/:/g, " -") || `Item ${i + 1}`;
    const xNum = parseTableNumber(row[1] ?? "");
    const yNum = parseTableNumber(row[2] ?? "");

    if (xNum === null || yNum === null) {
      return makeTablePasteError(
        "quadrant",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: (xNum === null ? row[1] : row[2] ?? "").trim() },
      );
    }
    parsedPoints.push({ label, x: xNum, y: yNum, rowNum });
  }

  const needsPercentNormalization = parsedPoints.some(
    (pt) => pt.x > 1 || pt.y > 1,
  );

  const lines: string[] = [];
  for (const pt of parsedPoints) {
    const normX = needsPercentNormalization
      ? pt.x / PERCENT_NORMALIZATION_DIVISOR
      : pt.x;
    const normY = needsPercentNormalization
      ? pt.y / PERCENT_NORMALIZATION_DIVISOR
      : pt.y;
    const clampedX = Math.max(0, Math.min(1, normX));
    const clampedY = Math.max(0, Math.min(1, normY));
    lines.push(
      `    ${pt.label}: [${formatCleanNumber(clampedX)}, ${formatCleanNumber(clampedY)}]`,
    );
  }

  return replaceDataLinesInSource(
    source,
    "quadrant",
    lines,
    (trimmed) => /^[^:\n]+:\s*\[\s*[-+]?\d/.test(trimmed),
    "quadrantChart",
  );
}

// ---------------------------------------------------------------------------
// 7. SANKEY (Mermaid sankey-beta)
// ---------------------------------------------------------------------------
export function parseSankeyTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount !== SANKEY_EXPECTED_COLUMNS) {
    return makeTablePasteError(
      "sankey",
      format,
      grid.colCount > SANKEY_EXPECTED_COLUMNS ? "too_many_columns" : "too_few_columns",
      grid.colCount > SANKEY_EXPECTED_COLUMNS
        ? "tablePaste.error.tooManyColumns"
        : "tablePaste.error.tooFewColumns",
      { expected: SANKEY_EXPECTED_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader = shouldSkipHeaderRow(grid.rows, [2]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("sankey", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const lines: string[] = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const from = (row[0] ?? "").trim();
    const to = (row[1] ?? "").trim();
    const rawVal = (row[2] ?? "").trim();
    if (!from && !to && !rawVal) continue;

    const num = parseTableNumber(rawVal);
    if (num === null) {
      return makeTablePasteError(
        "sankey",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: rawVal },
      );
    }

    const escapeCsv = (val: string): string =>
      val.includes(",") ? `"${val.replace(/"/g, '""')}"` : val;

    lines.push(
      `    ${escapeCsv(from || "Source")},${escapeCsv(to || "Target")},${formatCleanNumber(num)}`,
    );
  }

  if (lines.length === 0) {
    return makeTablePasteError("sankey", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  return replaceDataLinesInSource(
    source,
    "sankey",
    lines,
    (trimmed) =>
      !trimmed.startsWith("%%") &&
      !/^sankey(?:-beta)?\b/i.test(trimmed) &&
      trimmed.split(",").length >= 3,
    "sankey-beta",
  );
}
