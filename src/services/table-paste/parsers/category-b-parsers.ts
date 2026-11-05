import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  DEFAULT_GANTT_DURATION,
  DEFAULT_GANTT_START_DATE,
  DEFAULT_JOURNEY_SCORE,
  DEFAULT_NWDIAG_NETWORK,
  GANTT_MAX_COLUMNS,
  GANTT_MIN_COLUMNS,
  JOURNEY_MAX_COLUMNS,
  JOURNEY_MIN_COLUMNS,
  MAX_JOURNEY_SCORE,
  MIN_JOURNEY_SCORE,
  NWDIAG_MAX_COLUMNS,
  NWDIAG_MIN_COLUMNS,
  ORGCHART_MAX_COLUMNS,
  ORGCHART_MIN_COLUMNS,
  PACKET_EXPECTED_COLUMNS,
  TIMELINE_MAX_COLUMNS,
  TIMELINE_MIN_COLUMNS,
} from "../constants";
import {
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
// 1. ORGCHART (Mermaid Ext)
// ---------------------------------------------------------------------------
function toSafeOrgId(raw: string, fallbackIndex: number): string {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
  return cleaned || `Node_${fallbackIndex}`;
}

function isDottedMarker(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  return (
    lower === "dotted" ||
    lower === "dashed" ||
    lower === "-.->" ||
    lower === ".." ||
    lower === "пунктир" ||
    lower === "матричное"
  );
}

function looksLikeOrgHeader(row: readonly string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return /(?:manager|parent|from|source|руководит|начальник|родит|id|узел|подчин)/i.test(
    joined,
  );
}

export function parseOrgChartTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < ORGCHART_MIN_COLUMNS || grid.colCount > ORGCHART_MAX_COLUMNS) {
    return makeTablePasteError(
      "orgchart",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: ORGCHART_MIN_COLUMNS, max: ORGCHART_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader =
    grid.rows.length > 1 && looksLikeOrgHeader(grid.rows[0]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("orgchart", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const nodeDecls = new Map<string, string>();
  const edgeLines: string[] = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const col0 = (row[0] ?? "").trim();
    const col1 = (row[1] ?? "").trim();
    const col2 = (row[2] ?? "").trim();

    if (!col0 && !col1) continue;

    // 2 columns or 3 columns where col2 is edge style: Manager | Employee | [dotted]
    const fromId = toSafeOrgId(col0 || `Manager_${i + 1}`, i * 2 + 1);
    const toId = toSafeOrgId(col1 || `Member_${i + 1}`, i * 2 + 2);

    if (!nodeDecls.has(fromId)) {
      nodeDecls.set(fromId, `${fromId} [${col0 || fromId}]`);
    }
    if (!nodeDecls.has(toId)) {
      const label =
        col2 && !isDottedMarker(col2) ? `${col1} — ${col2}` : col1 || toId;
      nodeDecls.set(toId, `${toId} [${label}]`);
    }

    const arrow = isDottedMarker(col2) ? "-.->" : "->";
    edgeLines.push(`${fromId} ${arrow} ${toId}`);
  }

  if (edgeLines.length === 0) {
    return makeTablePasteError("orgchart", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const allGenerated = [...nodeDecls.values(), ...edgeLines];
  return replaceDataLinesInSource(
    source,
    "orgchart",
    allGenerated,
    (trimmed) =>
      !trimmed.startsWith("%%") &&
      !/^org(?:chart)?\b/i.test(trimmed) &&
      !/^title\b/i.test(trimmed) &&
      trimmed.length > 0,
    "orgchart",
  );
}

// ---------------------------------------------------------------------------
// 2. GANTT (Mermaid & PlantUML)
// ---------------------------------------------------------------------------
function looksLikeGanttHeader(row: readonly string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return /(?:task|задач|этап|start|начал|дата|duration|длительн|секци|section)/i.test(
    joined,
  );
}

function normalizeDurationMermaid(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_GANTT_DURATION;
  const num = parseTableNumber(trimmed);
  if (num !== null) {
    return `${Math.max(1, Math.round(num))}d`;
  }
  return trimmed;
}

function normalizeDurationPlantUmlDays(raw: string): number {
  const trimmed = raw.trim();
  const match = /^(\d+)/.exec(trimmed);
  if (match) {
    return Math.max(1, Number(match[1]));
  }
  return 3;
}

export function parseGanttTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < GANTT_MIN_COLUMNS || grid.colCount > GANTT_MAX_COLUMNS) {
    return makeTablePasteError(
      "gantt",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: GANTT_MIN_COLUMNS, max: GANTT_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader =
    grid.rows.length > 1 && looksLikeGanttHeader(grid.rows[0]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("gantt", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  if (format === "plantuml") {
    const pumlLines: string[] = [];
    let prevTaskName: string | null = null;

    for (let i = 0; i < dataRows.length; i += 1) {
      const row = dataRows[i];
      const taskName = (row[0] ?? "").trim() || `Task ${i + 1}`;
      const col1 = (row[1] ?? "").trim();
      const col2 = (row[2] ?? "").trim();

      const days =
        grid.colCount >= 3
          ? normalizeDurationPlantUmlDays(col2 || col1)
          : normalizeDurationPlantUmlDays(col1);

      pumlLines.push(`[${taskName}] lasts ${days} days`);
      if (/^\d{4}-\d{2}-\d{2}$/.test(col1)) {
        pumlLines.push(`[${taskName}] starts ${col1}`);
      } else if (prevTaskName) {
        pumlLines.push(`[${taskName}] starts at [${prevTaskName}]'s end`);
      }
      prevTaskName = taskName;
    }

    return replaceDataLinesInSource(
      source,
      "gantt",
      pumlLines,
      (trimmed) => /^\[[^\]]+\]\s+(?:lasts|starts|happens|is)\b/i.test(trimmed),
      `@startgantt\nproject starts ${DEFAULT_GANTT_START_DATE}\n@endgantt`,
    );
  }

  // Mermaid gantt
  const mmdLines: string[] = [];
  let currentSection = "";

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const taskName = (row[0] ?? "").trim().replace(/:/g, " -") || `Task ${i + 1}`;
    const taskId = `t${i + 1}`;

    let startSpec = DEFAULT_GANTT_START_DATE;
    let durationSpec = DEFAULT_GANTT_DURATION;
    let sectionName = "";

    if (grid.colCount === 2) {
      startSpec = i === 0 ? DEFAULT_GANTT_START_DATE : `after t${i}`;
      durationSpec = normalizeDurationMermaid(row[1] ?? "");
    } else if (grid.colCount >= 3) {
      const rawStart = (row[1] ?? "").trim();
      startSpec =
        rawStart || (i === 0 ? DEFAULT_GANTT_START_DATE : `after t${i}`);
      durationSpec = normalizeDurationMermaid(row[2] ?? "");
      sectionName = (row[3] ?? "").trim();
    }

    if (sectionName && sectionName !== currentSection) {
      currentSection = sectionName;
      mmdLines.push(`section ${currentSection}`);
    }

    mmdLines.push(`${taskName} :${taskId}, ${startSpec}, ${durationSpec}`);
  }

  return replaceDataLinesInSource(
    source,
    "gantt",
    mmdLines,
    (trimmed) =>
      /^section\b/i.test(trimmed) ||
      (!/^(?:gantt|title|dateFormat|axisFormat|excludes|todayMarker)\b/i.test(trimmed) &&
        !trimmed.startsWith("%%") &&
        trimmed.includes(":")),
    "gantt\ndateFormat YYYY-MM-DD",
  );
}

// ---------------------------------------------------------------------------
// 3. TIMELINE (Mermaid & PlantUML)
// ---------------------------------------------------------------------------
function looksLikeTimelineHeader(row: readonly string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return /(?:period|year|date|time|период|год|дата|событи|event|этап|section|секци)/i.test(
    joined,
  );
}

export function parseTimelineTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < TIMELINE_MIN_COLUMNS || grid.colCount > TIMELINE_MAX_COLUMNS) {
    return makeTablePasteError(
      "timeline",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: TIMELINE_MIN_COLUMNS, max: TIMELINE_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader =
    grid.rows.length > 1 && looksLikeTimelineHeader(grid.rows[0]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("timeline", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  if (format === "plantuml") {
    const lines = dataRows.map((row, idx) => {
      const period = (row[0] ?? "").trim() || `${2024 + idx}`;
      const event = (row[1] ?? "").trim() || `Event ${idx + 1}`;
      return `[${period}] is {${event}}`;
    });

    return replaceDataLinesInSource(
      source,
      "timeline",
      lines,
      (trimmed) => /^\[[^\]]+\]\s+is\b/i.test(trimmed),
      "@startchronology\n@endchronology",
    );
  }

  const lines: string[] = [];
  let currentSection = "";

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const period = (row[0] ?? "").trim() || `${2024 + i}`;
    const event = (row[1] ?? "").trim() || `Event ${i + 1}`;
    const section = (row[2] ?? "").trim();

    if (section && section !== currentSection) {
      currentSection = section;
      lines.push(`    section ${currentSection}`);
    }

    const indent = currentSection ? "      " : "    ";
    lines.push(`${indent}${period} : ${event}`);
  }

  return replaceDataLinesInSource(
    source,
    "timeline",
    lines,
    (trimmed) =>
      /^section\b/i.test(trimmed) ||
      (!/^(?:timeline|title)\b/i.test(trimmed) &&
        !trimmed.startsWith("%%") &&
        trimmed.includes(":")),
    "timeline",
  );
}

// ---------------------------------------------------------------------------
// 4. JOURNEY (Mermaid)
// ---------------------------------------------------------------------------
export function parseJourneyTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < JOURNEY_MIN_COLUMNS || grid.colCount > JOURNEY_MAX_COLUMNS) {
    return makeTablePasteError(
      "journey",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: JOURNEY_MIN_COLUMNS, max: JOURNEY_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader = shouldSkipHeaderRow(grid.rows, [1]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("journey", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const lines: string[] = [];
  let currentSection = "";

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const stepName = (row[0] ?? "").trim().replace(/:/g, " -") || `Step ${i + 1}`;
    const rawScore = (row[1] ?? "").trim();
    const actors = (row[2] ?? "").trim() || "User";
    const section = (row[3] ?? "").trim();

    const parsedScore = rawScore ? parseTableNumber(rawScore) : DEFAULT_JOURNEY_SCORE;
    if (parsedScore === null) {
      return makeTablePasteError(
        "journey",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: rawScore },
      );
    }

    const clampedScore = Math.max(
      MIN_JOURNEY_SCORE,
      Math.min(MAX_JOURNEY_SCORE, Math.round(parsedScore)),
    );

    if (section && section !== currentSection) {
      currentSection = section;
      lines.push(`    section ${currentSection}`);
    }

    lines.push(`      ${stepName}: ${clampedScore}: ${actors}`);
  }

  return replaceDataLinesInSource(
    source,
    "journey",
    lines,
    (trimmed) =>
      /^section\b/i.test(trimmed) ||
      (!/^(?:journey|title)\b/i.test(trimmed) &&
        !trimmed.startsWith("%%") &&
        trimmed.includes(":")),
    "journey",
  );
}

// ---------------------------------------------------------------------------
// 5. PACKET (Mermaid packet-beta)
// ---------------------------------------------------------------------------
function isBitRangeOrSize(raw: string): boolean {
  const t = raw.trim();
  return /^\d+\s*-\s*\d+$/.test(t) || isNumericCell(t);
}

export function parsePacketTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount !== PACKET_EXPECTED_COLUMNS) {
    return makeTablePasteError(
      "packet",
      format,
      grid.colCount > PACKET_EXPECTED_COLUMNS ? "too_many_columns" : "too_few_columns",
      grid.colCount > PACKET_EXPECTED_COLUMNS
        ? "tablePaste.error.tooManyColumns"
        : "tablePaste.error.tooFewColumns",
      { expected: PACKET_EXPECTED_COLUMNS, actual: grid.colCount },
    );
  }

  const col0BitsCount = grid.rows.filter((r) => isBitRangeOrSize(r[0] ?? "")).length;
  const col1BitsCount = grid.rows.filter((r) => isBitRangeOrSize(r[1] ?? "")).length;
  if (col0BitsCount === 0 && col1BitsCount === 0) {
    return makeTablePasteError(
      "packet",
      format,
      "ambiguous_columns",
      "tablePaste.error.noNumericColumn",
    );
  }

  const bitsCol = col0BitsCount >= col1BitsCount ? 0 : 1;
  const labelCol = bitsCol === 0 ? 1 : 0;

  const firstRowBits = (grid.rows[0][bitsCol] ?? "").trim();
  const skipHeader =
    grid.rows.length > 1 && !isBitRangeOrSize(firstRowBits);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;

  const lines: string[] = [];
  let nextBitOffset = 0;

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const rowNum = skipHeader ? i + 2 : i + 1;
    const rawBits = (row[bitsCol] ?? "").trim();
    const label = (row[labelCol] ?? "").trim().replace(/"/g, "'") || `Field ${i + 1}`;

    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(rawBits);
    if (rangeMatch) {
      const startBit = Number(rangeMatch[1]);
      const endBit = Number(rangeMatch[2]);
      nextBitOffset = endBit + 1;
      lines.push(`    ${startBit}-${endBit}: "${label}"`);
      continue;
    }

    const bitLength = parseTableNumber(rawBits);
    if (bitLength === null || bitLength <= 0) {
      return makeTablePasteError(
        "packet",
        format,
        "invalid_number",
        "tablePaste.error.invalidNumberAtRow",
        { row: rowNum, value: rawBits },
      );
    }

    const len = Math.max(1, Math.round(bitLength));
    const startBit = nextBitOffset;
    const endBit = startBit + len - 1;
    nextBitOffset = endBit + 1;
    lines.push(`    ${startBit}-${endBit}: "${label}"`);
  }

  return replaceDataLinesInSource(
    source,
    "packet",
    lines,
    (trimmed) => /^\d+(?:-\d+)?\s*:/.test(trimmed),
    "packet-beta",
  );
}

// ---------------------------------------------------------------------------
// 6. WBS & MINDMAP (PlantUML & Mermaid)
// ---------------------------------------------------------------------------
interface HierarchyTreeNode {
  label: string;
  children: Map<string, HierarchyTreeNode>;
}

function looksLikeHierarchyHeader(row: readonly string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return /(?:level\s*\d|уровень\s*\d|корень|root|ветк|branch|узлы|parent|child)/i.test(
    joined,
  );
}

export function parseHierarchyTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
  diagramType: "wbs" | "mindmap",
): TablePasteResult {
  const skipHeader =
    grid.rows.length > 1 && looksLikeHierarchyHeader(grid.rows[0]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError(diagramType, format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const roots = new Map<string, HierarchyTreeNode>();
  const lastNodeAtCol: (HierarchyTreeNode | undefined)[] = [];

  for (const row of dataRows) {
    let currentMap = roots;
    for (let col = 0; col < row.length; col += 1) {
      const cell = (row[col] ?? "").trim();
      if (!cell) {
        // Inherit previous row's node at this column if subsequent column has value
        const inherited = lastNodeAtCol[col];
        if (inherited) {
          currentMap = inherited.children;
        }
        continue;
      }

      let node = currentMap.get(cell);
      if (!node) {
        node = { label: cell, children: new Map() };
        currentMap.set(cell, node);
      }
      lastNodeAtCol[col] = node;
      // Clear deeper cached nodes when a parent changes
      for (let k = col + 1; k < row.length; k += 1) {
        lastNodeAtCol[k] = undefined;
      }
      currentMap = node.children;
    }
  }

  if (roots.size === 0) {
    return makeTablePasteError(diagramType, format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  if (format === "plantuml") {
    const pumlLines: string[] = [];
    const emitPlantUml = (node: HierarchyTreeNode, depth: number): void => {
      pumlLines.push(`${"*".repeat(depth)} ${node.label}`);
      for (const child of node.children.values()) {
        emitPlantUml(child, depth + 1);
      }
    };

    for (const root of roots.values()) {
      emitPlantUml(root, 1);
    }

    const startTag = diagramType === "wbs" ? "@startwbs" : "@startmindmap";
    const endTag = diagramType === "wbs" ? "@endwbs" : "@endmindmap";

    return replaceDataLinesInSource(
      source,
      diagramType,
      pumlLines,
      (trimmed) => /^[*+-]+(?:\[#[0-9a-fA-F]+\])?_?\s*:?.+/.test(trimmed) || trimmed === ";",
      `${startTag}\n${endTag}`,
    );
  }

  // Mermaid mindmap
  const mmdLines: string[] = [];
  const rootList = [...roots.values()];
  const emitMermaid = (node: HierarchyTreeNode, depth: number): void => {
    const indent = "  ".repeat(depth);
    if (depth === 1) {
      mmdLines.push(`${indent}root((${node.label}))`);
    } else {
      mmdLines.push(`${indent}${node.label}`);
    }
    for (const child of node.children.values()) {
      emitMermaid(child, depth + 1);
    }
  };

  if (rootList.length === 1) {
    emitMermaid(rootList[0], 1);
  } else {
    const virtualRoot: HierarchyTreeNode = {
      label: "Mindmap",
      children: roots,
    };
    emitMermaid(virtualRoot, 1);
  }

  return replaceDataLinesInSource(
    source,
    diagramType,
    mmdLines,
    (trimmed) =>
      !trimmed.startsWith("%%") &&
      !/^mindmap\b/i.test(trimmed) &&
      trimmed.length > 0,
    "mindmap",
  );
}

// ---------------------------------------------------------------------------
// 7. NWDIAG (PlantUML)
// ---------------------------------------------------------------------------
function looksLikeNwdiagHeader(row: readonly string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return /(?:node|host|server|узел|хост|сервер|ip|address|адрес|network|сеть)/i.test(
    joined,
  );
}

export function parseNwdiagTable(
  grid: ParsedClipboardGrid,
  source: string,
  format: DiagramFormat,
): TablePasteResult {
  if (grid.colCount < NWDIAG_MIN_COLUMNS || grid.colCount > NWDIAG_MAX_COLUMNS) {
    return makeTablePasteError(
      "nwdiag",
      format,
      "invalid_column_count",
      "tablePaste.error.expectedColumnRange",
      { min: NWDIAG_MIN_COLUMNS, max: NWDIAG_MAX_COLUMNS, actual: grid.colCount },
    );
  }

  const skipHeader =
    grid.rows.length > 1 && looksLikeNwdiagHeader(grid.rows[0]);
  const dataRows = skipHeader ? grid.rows.slice(1) : grid.rows;
  if (dataRows.length === 0) {
    return makeTablePasteError("nwdiag", format, "no_valid_rows", "tablePaste.error.noDataRows");
  }

  const networks = new Map<string, { node: string; address: string }[]>();

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    const nodeName =
      (row[0] ?? "").trim().replace(/\s+/g, "_") || `node_${i + 1}`;
    const address = (row[1] ?? "").trim().replace(/"/g, "");
    const netName =
      ((row[2] ?? "").trim().replace(/\s+/g, "_") || DEFAULT_NWDIAG_NETWORK);

    const list = networks.get(netName) ?? [];
    list.push({ node: nodeName, address });
    networks.set(netName, list);
  }

  const lines: string[] = [];
  for (const [netName, entries] of networks.entries()) {
    lines.push(`network ${netName} {`);
    for (const entry of entries) {
      if (entry.address) {
        lines.push(`  ${entry.node} [address = "${entry.address}"]`);
      } else {
        lines.push(`  ${entry.node}`);
      }
    }
    lines.push("}");
  }

  return replaceDataLinesInSource(
    source,
    "nwdiag",
    lines,
    (trimmed) =>
      !/^@startnwdiag\b/i.test(trimmed) &&
      !/^@endnwdiag\b/i.test(trimmed) &&
      !/^title\b/i.test(trimmed) &&
      !trimmed.startsWith("'"),
    "@startnwdiag\n@endnwdiag",
  );
}

// ---------------------------------------------------------------------------
// 8. WIREMARK TABLE (WireMark)
// ---------------------------------------------------------------------------
function buildWiremarkTableLines(
  grid: ParsedClipboardGrid,
  baseIndent: string,
): string[] {
  const rows = grid.rows;
  const hasHeader = rows.length >= 2;
  const headerRow = hasHeader ? rows[0] : null;
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  // Detect columns where all body values are numbers so we can add `align=right`
  const numericCols = new Set<number>();
  for (let c = 0; c < grid.colCount; c += 1) {
    const allNumeric =
      bodyRows.length > 0 &&
      bodyRows.every((r) => isNumericCell(r[c] ?? ""));
    if (allNumeric) {
      numericCols.add(c);
    }
  }

  const lines: string[] = [`${baseIndent}Table small`];

  if (headerRow) {
    lines.push(`${baseIndent}  TableHead`);
    lines.push(`${baseIndent}    TableRow`);
    for (let c = 0; c < grid.colCount; c += 1) {
      const text = (headerRow[c] ?? "").replace(/"/g, '\\"');
      const align = numericCols.has(c) ? " align=right" : "";
      lines.push(`${baseIndent}      TableCell "${text}"${align}`);
    }
  }

  lines.push(`${baseIndent}  TableBody`);
  for (const row of bodyRows) {
    lines.push(`${baseIndent}    TableRow`);
    for (let c = 0; c < grid.colCount; c += 1) {
      const text = (row[c] ?? "").replace(/"/g, '\\"');
      const align = numericCols.has(c) ? " align=right" : "";
      lines.push(`${baseIndent}      TableCell "${text}"${align}`);
    }
  }

  return lines;
}

export function parseWiremarkTable(
  grid: ParsedClipboardGrid,
  source: string,
): TablePasteResult {
  const lines = source.split(/\r?\n/);

  // Find if an existing `Table` component block exists in WireMark source
  let tableStartIdx = -1;
  let tableIndentLen = 2;

  for (let i = 0; i < lines.length; i += 1) {
    const match = /^(\s*)Table(?:\s|$)/.exec(lines[i]);
    if (match) {
      tableStartIdx = i;
      tableIndentLen = match[1].length;
      break;
    }
  }

  if (tableStartIdx >= 0) {
    let tableEndIdx = tableStartIdx + 1;
    while (tableEndIdx < lines.length) {
      const raw = lines[tableEndIdx];
      if (raw.trim().length === 0) {
        tableEndIdx += 1;
        continue;
      }
      const indent = /^(\s*)/.exec(raw)?.[1].length ?? 0;
      if (indent <= tableIndentLen) {
        break;
      }
      tableEndIdx += 1;
    }

    const baseIndent = " ".repeat(tableIndentLen);
    const tableLines = buildWiremarkTableLines(grid, baseIndent);
    const fullLines = [
      ...lines.slice(0, tableStartIdx),
      ...tableLines,
      ...lines.slice(tableEndIdx),
    ];

    return {
      ok: true,
      snippet: tableLines.join("\n"),
      fullSource: fullLines.join("\n"),
      replaceRange: { start: 0, end: source.length },
      diagramType: "wireframe",
    };
  }

  // Otherwise append Table into current wireframe or create a new Wireframe
  const trimmedSource = source.trim();
  if (!trimmedSource) {
    const tableLines = buildWiremarkTableLines(grid, "  ");
    const fullSource = `Wireframe #table landscape\n${tableLines.join("\n")}`;
    return {
      ok: true,
      snippet: tableLines.join("\n"),
      fullSource,
      replaceRange: { start: 0, end: source.length },
      diagramType: "wireframe",
    };
  }

  const tableLines = buildWiremarkTableLines(grid, "    ");
  const fullSource = `${source.trimEnd()}\n${tableLines.join("\n")}`;
  return {
    ok: true,
    snippet: tableLines.join("\n"),
    fullSource,
    replaceRange: { start: 0, end: source.length },
    diagramType: "wireframe",
  };
}
