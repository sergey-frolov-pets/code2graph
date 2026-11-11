import { sanitizeDiagramId } from "@/services/conversion/diagram-ir";
import {
  parseClipboardGrid,
  parseSingleColumnClipboard,
} from "@/services/table-paste/parse-clipboard-grid";
import type { ParsedClipboardGrid } from "@/services/table-paste/types";
import { GRAPH_EDGE_KIND_OPTIONS, GRAPH_NODE_KIND_OPTIONS } from "./schemas";
import type { BuilderGraphEdgeRow, BuilderGraphNodeRow } from "./types";

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

const DEFAULT_GRAPH_EDGE_KIND = GRAPH_EDGE_KIND_OPTIONS[0].value;
const DEFAULT_GRAPH_NODE_KIND = GRAPH_NODE_KIND_OPTIONS[0].value;
const GRAPH_EDGE_KIND_VALUES = new Set(
  GRAPH_EDGE_KIND_OPTIONS.map((option) => option.value),
);

export interface PastedGraphData {
  edges: BuilderGraphEdgeRow[];
  nodes: BuilderGraphNodeRow[];
}

function isGraphHeaderRow(rows: readonly (readonly string[])[]): boolean {
  if (rows.length < 2) {
    return false;
  }
  const headerKind = (rows[0]?.[3] ?? "").trim().toLowerCase();
  if (!headerKind || GRAPH_EDGE_KIND_VALUES.has(headerKind)) {
    return false;
  }
  if (!(rows[0]?.[0] ?? "").trim() || !(rows[0]?.[1] ?? "").trim()) {
    return false;
  }
  return rows.slice(1).every((row) => {
    const kind = (row[3] ?? "").trim().toLowerCase();
    return kind.length === 0 || GRAPH_EDGE_KIND_VALUES.has(kind);
  });
}

function findReusableNode(
  endpoint: string,
  previousNodes: readonly BuilderGraphNodeRow[],
  usedNodes: Set<BuilderGraphNodeRow>,
): BuilderGraphNodeRow | undefined {
  const key = endpoint.trim().toLowerCase();
  return previousNodes.find((node) => {
    if (usedNodes.has(node)) {
      return false;
    }
    return (
      node.id.trim().toLowerCase() === key ||
      node.label.trim().toLowerCase() === key
    );
  });
}

/**
 * Строки из буфера становятся всем графом: старые рёбра и узлы, которых нет
 * среди концов вставленных строк, удаляются. Оформление оставшихся узлов
 * сохраняется. Шапка, которую пишет кнопка «В буфер», пропускается.
 */
export function replaceGraphDataFromPastedRows(
  rows: readonly (readonly string[])[],
  previousNodes: readonly BuilderGraphNodeRow[],
): PastedGraphData {
  const dataRows = isGraphHeaderRow(rows) ? rows.slice(1) : rows;
  const edges: BuilderGraphEdgeRow[] = dataRows.map((row) => ({
    source: (row[0] ?? "").trim(),
    target: (row[1] ?? "").trim(),
    label: (row[2] ?? "").trim(),
    kind: (row[3] ?? "").trim() || DEFAULT_GRAPH_EDGE_KIND,
  }));

  const nodes: BuilderGraphNodeRow[] = [];
  const knownKeys = new Set<string>();
  const usedNodes = new Set<BuilderGraphNodeRow>();

  const remember = (value: string): void => {
    const key = value.trim().toLowerCase();
    if (key) {
      knownKeys.add(key);
    }
  };

  for (const edge of edges) {
    for (const endpoint of [edge.source, edge.target]) {
      const trimmed = endpoint.trim();
      if (!trimmed || knownKeys.has(trimmed.toLowerCase())) {
        continue;
      }

      const existing = findReusableNode(trimmed, previousNodes, usedNodes);
      if (existing) {
        usedNodes.add(existing);
        nodes.push(existing);
        remember(existing.id);
        remember(existing.label);
        remember(trimmed);
        continue;
      }

      let safeId = sanitizeDiagramId(trimmed);
      if (knownKeys.has(safeId.toLowerCase())) {
        safeId = sanitizeDiagramId(`N${nodes.length + 1}`);
      }
      nodes.push({
        id: safeId,
        label: trimmed,
        kind: DEFAULT_GRAPH_NODE_KIND,
        group: "",
        color: "",
      });
      remember(safeId);
      remember(trimmed);
    }
  }

  return { edges, nodes };
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
