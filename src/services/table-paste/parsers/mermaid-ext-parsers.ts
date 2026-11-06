import type { DiagramFormat } from "@/constants/diagram-formats";
import { isValidExtColor } from "@/services/mermaid/ext/color-utils";
import {
  BOXPLOT_MIN_COLUMNS,
  CLUSTERED_MIN_COLUMNS,
  CLUSTERED_MIN_ROWS,
  RADAR_MIN_COLUMNS,
  RADAR_MIN_ROWS,
  TREEMAP_MAX_COLUMNS,
  TREEMAP_MIN_COLUMNS,
  VORONOI_MAX_COLUMNS,
  VORONOI_MIN_COLUMNS,
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

const FIVE_SUMMARY_COLS = 6;

// ---------------------------------------------------------------------------
// 1. BOXPLOT (Mermaid Ext)
// ---------------------------------------------------------------------------
export function parseBoxplotTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < BOXPLOT_MIN_COLUMNS) {
    return makeTablePasteError(
      "boxplot",
      format,
      "too_few_columns",
      "tablePaste.error.tooFewColumnsMin",
      { min: BOXPLOT_MIN_COLUMNS, actual: grid.colCount },
    );
  }

  const numericCols = Array.from({ length: grid.colCount - 1 }, (_, i) => i + 1);
  const skipHeader = shouldSkipHeaderRow(grid.rows, numericCols);
  const headerCells = skipHeader ? grid.rows[0].map((c) => c.trim().toLowerCase()) : [];
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;

  if (dataRows.length === 0) {
    return makeTablePasteError("boxplot", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const headerLooksLikeFiveNumber =
    grid.colCount === FIVE_SUMMARY_COLS &&
    headerCells.some((h) => h === "q1" || h === "median" || h === "медиана" || h === "q3");

  const parsedRows: Array<{ label: string; nums: number[]; rowNum: number }> = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const label = (row[0] ?? "").trim() || `Group ${i + 1}`;
    const rawValues = row.slice(1).map((c) => c.trim()).filter((c) => c.length > 0);
    if (rawValues.length === 0) continue;

    const nums: number[] = [];
    for (const cell of rawValues) {
      const n = parseTableNumber(cell);
      if (n === null) {
        return makeTablePasteError(
          "boxplot",
          format,
          "invalid_number",
          "tablePaste.error.invalidNumberAtRow",
          { row: rowNum, value: cell },
        );
      }
      nums.push(n);
    }
    parsedRows.push({ label, nums, rowNum });
  }

  if (parsedRows.length === 0) {
    return makeTablePasteError("boxplot", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const allOrderedFive =
    grid.colCount === FIVE_SUMMARY_COLS &&
    parsedRows.every(
      (r) =>
        r.nums.length === 5 &&
        r.nums[0] <= r.nums[1] &&
        r.nums[1] <= r.nums[2] &&
        r.nums[2] <= r.nums[3] &&
        r.nums[3] <= r.nums[4],
    );

  const useFiveNumberSummary = headerLooksLikeFiveNumber || allOrderedFive;
  const lines: string[] = [];

  for (const r of parsedRows) {
    if (useFiveNumberSummary && r.nums.length === 5) {
      const [min, q1, median, q3, max] = r.nums;
      if (!(min <= q1 && q1 <= median && median <= q3 && q3 <= max)) {
        return makeTablePasteError(
          "boxplot",
          format,
          "invalid_number",
          "tablePaste.error.invalidNumberAtRow",
          { row: r.rowNum, value: r.nums.map(formatCleanNumber).join(", ") },
        );
      }
      lines.push(
        `${r.label} : min=${formatCleanNumber(min)}, q1=${formatCleanNumber(q1)}, median=${formatCleanNumber(median)}, q3=${formatCleanNumber(q3)}, max=${formatCleanNumber(max)}`,
      );
    } else {
      if (r.nums.length < 3) {
        return makeTablePasteError(
          "boxplot",
          format,
          "too_few_columns",
          "tablePaste.error.tooFewColumnsMin",
          { min: BOXPLOT_MIN_COLUMNS, actual: r.nums.length + 1 },
        );
      }
      lines.push(`${r.label} : values=${r.nums.map(formatCleanNumber).join(", ")}`);
    }
  }

  return replaceDataLinesInSource(
    source,
    "boxplot",
    lines,
    (trimmed) =>
      !trimmed.startsWith("%%") &&
      !/^(?:boxplot|box-plot|box|title|y|grid|fontsize|mono|colors|data|end)\b/i.test(trimmed) &&
      trimmed.includes(":"),
    "boxplot",
  );
}

// ---------------------------------------------------------------------------
// 2. TREEMAP (Mermaid Ext)
// ---------------------------------------------------------------------------
export function parseTreemapTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < TREEMAP_MIN_COLUMNS || grid.colCount > TREEMAP_MAX_COLUMNS) {
    return makeTablePasteError(
      "treemap",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: TREEMAP_MIN_COLUMNS, max: TREEMAP_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  // Определяем индекс числовой колонки с весом (для 2 колонок — 1 или 0, для 3-4 колонок — 2 или 1)
  const weightCol =
    grid.colCount === 2
      ? grid.rows.filter((r) => isNumericCell(r[1] ?? "")).length >=
        grid.rows.filter((r) => isNumericCell(r[0] ?? "")).length
        ? 1
        : 0
      : grid.rows.filter((r) => isNumericCell(r[2] ?? "")).length >=
          grid.rows.filter((r) => isNumericCell(r[1] ?? "")).length
        ? 2
        : 1;

  const skipHeader = shouldSkipHeaderRow(grid.rows, [weightCol]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("treemap", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const lines: string[] = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const rawWeight = (row[weightCol] ?? "").trim();
    if (!rawWeight && row.every((c) => !c.trim())) continue;

    const num = parseTableNumber(rawWeight);
    if (num === null) {
      return makeTablePasteError(
        "treemap",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: rawWeight },
      );
    }
    if (num <= 0) {
      return makeTablePasteError(
        "treemap",
        format,
        "negative_number_not_allowed",
        "tablePaste.error.negativeNotAllowedAtRow",
        { row: rowNum, value: rawWeight },
      );
    }

    let pathLabel: string;
    let colorSuffix = "";

    if (grid.colCount === 2) {
      const labelCol = weightCol === 1 ? 0 : 1;
      pathLabel = (row[labelCol] ?? "").trim() || `Item ${i + 1}`;
    } else if (weightCol === 2) {
      const grp = (row[0] ?? "").trim();
      const leaf = (row[1] ?? "").trim() || `Item ${i + 1}`;
      pathLabel = grp ? `${grp} / ${leaf}` : leaf;
      const rawColor = (row[3] ?? "").trim();
      if (rawColor && isValidExtColor(rawColor)) {
        colorSuffix = ` color=${rawColor}`;
      }
    } else {
      // weightCol === 1 (Label | Weight | Color)
      pathLabel = (row[0] ?? "").trim() || `Item ${i + 1}`;
      const rawColor = (row[2] ?? "").trim();
      if (rawColor && isValidExtColor(rawColor)) {
        colorSuffix = ` color=${rawColor}`;
      }
    }

    lines.push(`${pathLabel} : ${formatCleanNumber(num)}${colorSuffix}`);
  }

  if (lines.length === 0) {
    return makeTablePasteError("treemap", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  return replaceDataLinesInSource(
    source,
    "treemap",
    lines,
    (trimmed) =>
      !trimmed.startsWith("%%") &&
      (/^(?:group|section)\b/i.test(trimmed) ||
        (!/^(?:treemap|tree-map|title|labels|fontsize|mono|colors|data|end)\b/i.test(trimmed) &&
          trimmed.includes(":"))),
    "treemap",
  );
}

// ---------------------------------------------------------------------------
// 3. RADAR (Mermaid Ext)
// ---------------------------------------------------------------------------
export function parseRadarTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < RADAR_MIN_COLUMNS) {
    return makeTablePasteError(
      "radar",
      format,
      "too_few_columns",
      "tablePaste.error.tooFewColumnsMin",
      { min: RADAR_MIN_COLUMNS, actual: grid.colCount },
    );
  }
  if (grid.rowCount < RADAR_MIN_ROWS) {
    return makeTablePasteError(
      "radar",
      format,
      "too_few_rows",
      "tablePaste.error.tooFewRowsMin",
      { min: RADAR_MIN_ROWS, actual: grid.rowCount },
    );
  }

  const firstRowCells = grid.rows[0].slice(1);
  const firstRowIsHeader = firstRowCells.some((c) => c.trim().length > 0 && !isNumericCell(c));
  const axesLabels = firstRowIsHeader
    ? firstRowCells.map((c, idx) => c.trim() || `Axis ${idx + 1}`)
    : Array.from({ length: grid.colCount - 1 }, (_, idx) => `Axis ${idx + 1}`);

  const dataRows = firstRowIsHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("radar", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const seriesLines: string[] = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = firstRowIsHeader ? i + 2 : i + 1;
    const seriesName = (row[0] ?? "").trim() || `Series ${i + 1}`;
    const valueCells = row.slice(1, axesLabels.length + 1);
    const nums: string[] = [];

    for (let c = 0; c < axesLabels.length; c += 1) {
      const rawCell = (valueCells[c] ?? "").trim();
      const num = parseTableNumber(rawCell);
      if (num === null) {
        return makeTablePasteError(
          "radar",
          format,
          "invalid_number",
          "tablePaste.error.invalidNumberAtRow",
          { row: rowNum, value: rawCell },
        );
      }
      nums.push(formatCleanNumber(num));
    }

    seriesLines.push(`series ${seriesName} : ${nums.join(", ")}`);
  }

  const formatAxis = (a: string) => (a.includes(",") ? `"${a}"` : a);
  const generatedLines = [`axes ${axesLabels.map(formatAxis).join(", ")}`, ...seriesLines];

  return replaceDataLinesInSource(
    source,
    "radar",
    generatedLines,
    (trimmed) =>
      !trimmed.startsWith("%%") &&
      (/^(?:axes|axis|series)\b/i.test(trimmed) ||
        (!/^(?:radar|radarchart|spider|title|scale|max|rings|fill|dots|fontsize|mono|colors|data|end)\b/i.test(
          trimmed,
        ) &&
          trimmed.includes(":"))),
    "radar",
  );
}

// ---------------------------------------------------------------------------
// 4. VORONOI (Mermaid Ext)
// ---------------------------------------------------------------------------
export function parseVoronoiTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < VORONOI_MIN_COLUMNS || grid.colCount > VORONOI_MAX_COLUMNS) {
    return makeTablePasteError(
      "voronoi",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: VORONOI_MIN_COLUMNS, max: VORONOI_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader = shouldSkipHeaderRow(grid.rows, [1, 2]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("voronoi", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const siteLines: string[] = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const label = (row[0] ?? "").trim() || `Site ${i + 1}`;
    const xNum = parseTableNumber(row[1] ?? "");
    const yNum = parseTableNumber(row[2] ?? "");

    if (xNum === null || yNum === null) {
      const badVal = xNum === null ? row[1] : row[2];
      return makeTablePasteError(
        "voronoi",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: String(badVal ?? "").trim() },
      );
    }

    const col3 = (row[3] ?? "").trim();
    const col4 = (row[4] ?? "").trim();
    let groupPart = "";
    let colorPart = "";

    if (col3) {
      if (isValidExtColor(col3) && !col4) {
        colorPart = `, color=${col3}`;
      } else {
        groupPart = `, group=${col3}`;
      }
    }
    if (col4 && isValidExtColor(col4)) {
      colorPart = `, color=${col4}`;
    }

    siteLines.push(
      `${label} : x=${formatCleanNumber(xNum)}, y=${formatCleanNumber(yNum)}${groupPart}${colorPart}`,
    );
  }

  const hasDataKeyword = /^\s*data\s*$/im.test(source);
  const newLines = hasDataKeyword ? siteLines : ["data", ...siteLines];

  return replaceDataLinesInSource(
    source,
    "voronoi",
    newLines,
    (trimmed) =>
      !trimmed.startsWith("%%") &&
      !/^(?:voronoi|voronoi-diagram|title|x|y|sites|labels|fontsize|mono|colors|data|end)\b/i.test(
        trimmed,
      ) &&
      trimmed.includes(":"),
    "voronoi",
  );
}

// ---------------------------------------------------------------------------
// 5. CLUSTERED BAR CHART (Mermaid Ext)
// ---------------------------------------------------------------------------
export function parseClusteredTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < CLUSTERED_MIN_COLUMNS) {
    return makeTablePasteError(
      "series",
      format,
      "too_few_columns",
      "tablePaste.error.tooFewColumnsMin",
      { min: CLUSTERED_MIN_COLUMNS, actual: grid.colCount },
    );
  }
  if (grid.rowCount < CLUSTERED_MIN_ROWS) {
    return makeTablePasteError(
      "series",
      format,
      "too_few_rows",
      "tablePaste.error.tooFewRowsMin",
      { min: CLUSTERED_MIN_ROWS, actual: grid.rowCount },
    );
  }

  const numericCols = Array.from({ length: grid.colCount - 1 }, (_, i) => i + 1);
  const hasHeader = shouldSkipHeaderRow(grid.rows, numericCols);
  const topLeft = (grid.rows[0][0] ?? "").trim().toLowerCase();
  const rowsAreSeries = hasHeader && /^(?:series|серия|ряд|группа)\b/i.test(topLeft);

  const dataRows = hasHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("series", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const formatCat = (c: string) => (c.includes(",") ? `"${c}"` : c);

  if (rowsAreSeries) {
    const categories = grid.rows[0]
      .slice(1)
      .map((c, idx) => c.trim() || `Cat ${idx + 1}`);
    const seriesLines: string[] = [];

    for (let r = 0; r < dataRows.length; r += 1) {
      const row = dataRows[r];
      const rowNum = r + 2;
      const seriesName = (row[0] ?? "").trim() || `Series ${r + 1}`;
      const nums: string[] = [];
      for (let c = 0; c < categories.length; c += 1) {
        const raw = (row[c + 1] ?? "").trim();
        const n = parseTableNumber(raw);
        if (n === null) {
          return makeTablePasteError(
            "series",
            format,
            "invalid_number",
            "tablePaste.error.invalidNumberAtRow",
            { row: rowNum, value: raw },
          );
        }
        nums.push(formatCleanNumber(n));
      }
      seriesLines.push(`series ${seriesName} : ${nums.join(", ")}`);
    }

    const generated = [`categories ${categories.map(formatCat).join(", ")}`, ...seriesLines];
    return replaceDataLinesInSource(
      source,
      "series",
      generated,
      (trimmed) =>
        !trimmed.startsWith("%%") &&
        (/^(?:categories|x)\b/i.test(trimmed) ||
          (/^series\b/i.test(trimmed) && trimmed.includes(":")) ||
          (!/^(?:series|title|rotate|orientation|horizontal|vertical|invert|y|grid|axis|labels|fontsize|mono|colors|ratio|aspect|stacked|bars|layout|line|break|cagr|data|end)\b/i.test(
            trimmed,
          ) &&
            trimmed.includes(":"))),
      "series",
    );
  }

  // Классическая таблица: строки — категории, колонки 1..M — серии
  const seriesCount = grid.colCount - 1;
  const seriesNames = hasHeader
    ? grid.rows[0].slice(1).map((c, idx) => c.trim() || `Series ${idx + 1}`)
    : Array.from({ length: seriesCount }, (_, idx) => `Series ${idx + 1}`);

  const categories: string[] = [];
  const seriesValues: string[][] = Array.from({ length: seriesCount }, () => []);

  for (let r = 0; r < dataRows.length; r += 1) {
    const row = dataRows[r];
    const rowNum = hasHeader ? r + 2 : r + 1;
    const catName = (row[0] ?? "").trim() || `Cat ${r + 1}`;
    categories.push(catName);

    for (let s = 0; s < seriesCount; s += 1) {
      const rawCell = (row[s + 1] ?? "").trim();
      const n = parseTableNumber(rawCell);
      if (n === null) {
        return makeTablePasteError(
          "series",
          format,
          "invalid_number",
          "tablePaste.error.invalidNumberAtRow",
          { row: rowNum, value: rawCell },
        );
      }
      seriesValues[s].push(formatCleanNumber(n));
    }
  }

  const generated = [
    `categories ${categories.map(formatCat).join(", ")}`,
    ...seriesNames.map((name, idx) => `series ${name} : ${seriesValues[idx].join(", ")}`),
  ];

  return replaceDataLinesInSource(
    source,
    "series",
    generated,
    (trimmed) =>
      !trimmed.startsWith("%%") &&
      (/^(?:categories|x)\b/i.test(trimmed) ||
        (/^series\b/i.test(trimmed) && trimmed.includes(":")) ||
        (!/^(?:series|title|rotate|orientation|horizontal|vertical|invert|y|grid|axis|labels|fontsize|mono|colors|ratio|aspect|stacked|bars|layout|line|break|cagr|data|end)\b/i.test(
          trimmed,
        ) &&
          trimmed.includes(":"))),
    "series",
  );
}
