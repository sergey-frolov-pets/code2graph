import type { DiagramFormat } from "@/constants/diagram-formats";
import { getTablePasteExpectedSpec } from "./constants";
import {
  detectTableDiagramType,
  supportsTablePaste,
} from "./detect-table-diagram-type";
import { parseClipboardGrid, parseSingleColumnClipboard } from "./parse-clipboard-grid";
import {
  parseBubbleTable,
  parseEvTable,
  parseHeatmapTable,
  parsePieTable,
  parseQuadrantTable,
  parseSankeyTable,
  parseXyChartTable,
} from "./parsers/category-a-parsers";
import {
  parseGanttTable,
  parseHierarchyTable,
  parseJourneyTable,
  parseNwdiagTable,
  parseOrgChartTable,
  parsePowermapTable,
  parsePacketTable,
  parseTimelineTable,
  parseWiremarkTable,
} from "./parsers/category-b-parsers";
import {
  parseBoxplotTable,
  parseClusteredTable,
  parseRadarTable,
  parseTreemapTable,
  parseVoronoiTable,
} from "./parsers/mermaid-ext-parsers";
import { parseWaterfallTable } from "./parsers/waterfall-table-parser";
import { applyPlantUmlMindmapPlacement } from "./plantuml-mindmap-paste";
import { makeTablePasteError } from "./replace-data-section";
import type {
  TablePasteDiagramType,
  TablePasteErrorInfo,
  TablePasteResult,
} from "./types";

export {
  detectTableDiagramType,
  getTablePasteExpectedSpec,
  supportsTablePaste,
  type TablePasteDiagramType,
  type TablePasteErrorInfo,
  type TablePasteResult,
};

export function createClipboardReadError(
  source: string,
  format: DiagramFormat,
): TablePasteErrorInfo {
  const diagramType = detectTableDiagramType(source, format) ?? "waterfall";
  return {
    code: "clipboard_read_failed",
    reasonKey: "tablePaste.error.clipboardReadFailed",
    diagramType,
    format,
    expected: getTablePasteExpectedSpec(diagramType, format),
  };
}

export function applyTableFromClipboardText(input: {
  clipboardText: string;
  source: string;
  format: DiagramFormat;
  selectionRange?: { start: number; end: number };
  /** Caret offset in `source`. Used by PlantUML mindmap paste. */
  cursorOffset?: number;
}): TablePasteResult {
  const { clipboardText, source, format, selectionRange, cursorOffset } = input;
  const diagramType = detectTableDiagramType(source, format) ?? "waterfall";

  if (!clipboardText || clipboardText.trim().length === 0) {
    return makeTablePasteError(
      diagramType,
      format,
      "empty_clipboard",
      "tablePaste.error.emptyClipboard",
    );
  }

  const grid =
    parseClipboardGrid(clipboardText) ??
    (diagramType === "xychart" ? parseSingleColumnClipboard(clipboardText) : null);
  if (!grid) {
    return makeTablePasteError(
      diagramType,
      format,
      "not_a_table",
      "tablePaste.error.notATable",
    );
  }

  let result: TablePasteResult;

  switch (diagramType) {
    case "waterfall":
      result = parseWaterfallTable(grid, source, format);
      break;
    case "pie":
      result = parsePieTable(grid, source, format);
      break;
    case "heatmap":
      result = parseHeatmapTable(grid, source, format);
      break;
    case "bubble":
      result = parseBubbleTable(grid, source, format);
      break;
    case "ev":
      result = parseEvTable(grid, source, format);
      break;
    case "boxplot":
      result = parseBoxplotTable(grid, source, format);
      break;
    case "treemap":
      result = parseTreemapTable(grid, source, format);
      break;
    case "radar":
      result = parseRadarTable(grid, source, format);
      break;
    case "voronoi":
      result = parseVoronoiTable(grid, source, format);
      break;
    case "series":
      result = parseClusteredTable(grid, source, format);
      break;
    case "xychart":
      result = parseXyChartTable(grid, source, format);
      break;
    case "quadrant":
      result = parseQuadrantTable(grid, source, format);
      break;
    case "sankey":
      result = parseSankeyTable(grid, source, format);
      break;
    case "orgchart":
      result = parseOrgChartTable(grid, source, format);
      break;
    case "powermap":
      result = parsePowermapTable(grid, source, format);
      break;
    case "gantt":
      result = parseGanttTable(grid, source, format);
      break;
    case "timeline":
      result = parseTimelineTable(grid, source, format);
      break;
    case "journey":
      result = parseJourneyTable(grid, source, format);
      break;
    case "packet":
      result = parsePacketTable(grid, source, format);
      break;
    case "wbs":
      result = parseHierarchyTable(grid, source, format, "wbs");
      break;
    case "mindmap":
      result = parseHierarchyTable(grid, source, format, "mindmap");
      break;
    case "nwdiag":
      result = parseNwdiagTable(grid, source, format);
      break;
    case "wireframe":
      result = parseWiremarkTable(grid, source);
      break;
  }

  if (!result.ok) {
    return result;
  }

  if (format === "plantuml" && diagramType === "mindmap") {
    return applyPlantUmlMindmapPlacement({
      source,
      snippet: result.snippet,
      selectionRange,
      cursorOffset,
    });
  }

  // If the user explicitly selected a text range in the editor, replace that selection with `snippet`
  if (selectionRange && selectionRange.end > selectionRange.start) {
    const before = source.slice(0, selectionRange.start);
    const after = source.slice(selectionRange.end);
    const fullSource = `${before}${result.snippet}${after}`;
    return {
      ...result,
      fullSource,
      replaceRange: selectionRange,
    };
  }

  return result;
}
