import type { DiagramFormat } from "@/constants/diagram-formats";
import type { LocaleKey } from "@/locales/types";

export const TABLE_PASTE_DIAGRAM_TYPES = [
  "waterfall",
  "pie",
  "heatmap",
  "bubble",
  "ev",
  "boxplot",
  "treemap",
  "radar",
  "voronoi",
  "clustered",
  "xychart",
  "quadrant",
  "sankey",
  "orgchart",
  "gantt",
  "timeline",
  "journey",
  "packet",
  "wbs",
  "mindmap",
  "nwdiag",
  "wireframe",
] as const;

export type TablePasteDiagramType = (typeof TABLE_PASTE_DIAGRAM_TYPES)[number];

export type TablePasteErrorCode =
  | "empty_clipboard"
  | "clipboard_read_failed"
  | "not_a_table"
  | "too_few_rows"
  | "too_few_columns"
  | "too_many_columns"
  | "invalid_column_count"
  | "ambiguous_columns"
  | "invalid_number"
  | "negative_number_not_allowed"
  | "no_starting_value"
  | "no_valid_rows";

export interface TablePasteExpectedSpec {
  diagramType: TablePasteDiagramType;
  format: DiagramFormat;
  titleKey: LocaleKey;
  columnsKey: LocaleKey;
  rulesKey: LocaleKey;
  sampleHeadersKey: LocaleKey;
  sampleRows: readonly (readonly string[])[];
}

export interface TablePasteErrorInfo {
  code: TablePasteErrorCode;
  reasonKey: LocaleKey;
  reasonParams?: Record<string, string | number>;
  diagramType: TablePasteDiagramType;
  format: DiagramFormat;
  expected: TablePasteExpectedSpec;
}

export interface TablePasteReplaceRange {
  start: number;
  end: number;
}

export type TablePasteResult =
  | {
      ok: true;
      snippet: string;
      fullSource: string;
      replaceRange: TablePasteReplaceRange;
      diagramType: TablePasteDiagramType;
    }
  | {
      ok: false;
      error: TablePasteErrorInfo;
    };

export interface ParsedClipboardGrid {
  rows: string[][];
  rowCount: number;
  colCount: number;
}
