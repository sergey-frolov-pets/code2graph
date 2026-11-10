import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import {
  buildDisplayText,
  buildFoldPlaceholder,
  buildVisibleLines,
  type CodeFoldRegion,
  type VisibleLine,
} from "@/utils/code-folds";
import {
  EDITOR_HIGHLIGHT_DEBOUNCE_MS,
  EDITOR_TAB_SIZE,
  EDITOR_VIRTUAL_LINE_THRESHOLD,
} from "@/constants/editor-settings";
import { getFormatHandler } from "@/formats";
import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  anchorHiddenInsert,
  buildViewFolds,
  type SessionLineRole,
  type SessionProjection,
} from "@/services/editor/session-changes";

export const EDITOR_LINE_HEIGHT = 1.45;
export const FOLD_TOGGLE_WIDTH = "12px";
export const EDITOR_PADDING = "12px";
export const GUTTER_PADDING_INLINE = "2px";
export const GUTTER_ITEM_GAP = "1px";
export const GUTTER_BORDER_WIDTH = "1px";

export interface GutterRow {
  key: string;
  sourceLine: number;
  lineNumber: number | null;
  visibleLine: VisibleLine;
  fold: CodeFoldRegion | null;
  sessionRole: Exclude<SessionLineRole, "context"> | null;
  hunkId: string | null;
  markerBeforeHunkId: string | null;
  markerAfterHunkId: string | null;
}

export interface VisibleEditorLine {
  key: string;
  kind: VisibleLine["kind"];
  sourceLine: number;
  text: string;
  html?: string;
  sessionRole: Exclude<SessionLineRole, "context"> | null;
}

export function useEditorDisplayModel(options: {
  source: Ref<string>;
  folds: Ref<CodeFoldRegion[]>;
  sessionProjection: Ref<SessionProjection | null>;
  syntaxHighlightEnabled: Ref<boolean>;
  diagramFormat: Ref<DiagramFormat>;
  editorFontSize: Ref<string>;
  editorFontFamily: Ref<string>;
}) {
  const {
    source,
    folds,
    sessionProjection,
    syntaxHighlightEnabled,
    diagramFormat,
    editorFontSize,
    editorFontFamily,
  } = options;

  const sourceLines = computed(() => {
    const projection = sessionProjection.value;
    if (projection) {
      return projection.lines.map((line) => line.text);
    }

    return source.value.split(/\r?\n/);
  });

  const displayFolds = computed(() => {
    const projection = sessionProjection.value;
    if (!projection) {
      return folds.value;
    }

    return buildViewFolds(folds.value, projection.lines);
  });

  const highlightRevision = ref(0);
  let highlightTimer: ReturnType<typeof setTimeout> | undefined;

  watch(
    [source, folds, sessionProjection, syntaxHighlightEnabled, diagramFormat],
    () => {
      if (highlightTimer) {
        clearTimeout(highlightTimer);
      }

      highlightTimer = setTimeout(() => {
        highlightRevision.value += 1;
      }, EDITOR_HIGHLIGHT_DEBOUNCE_MS);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (highlightTimer) {
      clearTimeout(highlightTimer);
    }
  });

  const lineCount = computed(() => Math.max(sourceLines.value.length, 1));

  const useLineVirtualization = computed(
    () => lineCount.value > EDITOR_VIRTUAL_LINE_THRESHOLD,
  );

  const displayText = computed(() =>
    buildDisplayText(sourceLines.value, displayFolds.value),
  );

  const visibleLines = computed(() =>
    buildVisibleLines(lineCount.value, displayFolds.value),
  );

  const foldsByStartLine = computed(() => {
    const map = new Map<number, CodeFoldRegion>();

    for (const fold of folds.value) {
      map.set(fold.startLine, fold);
    }

    return map;
  });

  const gutterRows = computed<GutterRow[]>(() =>
    visibleLines.value.map((visibleLine, index) => {
      const projectedLine =
        sessionProjection.value && visibleLine.kind === "source"
          ? sessionProjection.value.lines[visibleLine.sourceLine - 1]
          : undefined;
      const sessionRole =
        projectedLine && projectedLine.role !== "context"
          ? projectedLine.role
          : null;
      const workingLine = projectedLine?.foldLine ?? null;

      return {
        key: `${visibleLine.kind}-${visibleLine.sourceLine}-${index}`,
        sourceLine: sessionProjection.value
          ? (workingLine ?? 0)
          : visibleLine.sourceLine,
        lineNumber: projectedLine
          ? projectedLine.gutterLine
          : visibleLine.kind === "source"
            ? visibleLine.sourceLine
            : null,
        visibleLine,
        fold: projectedLine
          ? workingLine
            ? (foldsByStartLine.value.get(workingLine) ?? null)
            : null
          : visibleLine.kind === "source"
            ? (foldsByStartLine.value.get(visibleLine.sourceLine) ?? null)
            : null,
        sessionRole,
        hunkId: projectedLine?.hunkId ?? null,
        markerBeforeHunkId: null,
        markerAfterHunkId: null,
      };
    }),
  );

  const gutterRowsWithMarkers = computed<GutterRow[]>(() => {
    const rows = gutterRows.value.map((row) => ({ ...row }));
    const projection = sessionProjection.value;
    if (!projection || projection.hidden.length === 0) {
      return rows;
    }

    const visibleRowIndexes: number[] = [];
    const visibleViewIndexes: number[] = [];
    visibleLines.value.forEach((line, rowIndex) => {
      if (line.kind !== "source") {
        return;
      }
      visibleRowIndexes.push(rowIndex);
      visibleViewIndexes.push(line.sourceLine - 1);
    });

    for (const span of projection.hidden) {
      const anchor = anchorHiddenInsert(span.beforeViewIndex, visibleViewIndexes);
      const rowIndex = anchor
        ? visibleRowIndexes[anchor.visibleIndex]
        : rows.length - 1;
      const row = anchor ? rows[rowIndex ?? -1] : rows[rows.length - 1];
      if (!row || !anchor) {
        if (row) {
          row.markerAfterHunkId = span.hunkId;
        }
        continue;
      }
      if (anchor.edge === "before") {
        row.markerBeforeHunkId = span.hunkId;
      } else {
        row.markerAfterHunkId = span.hunkId;
      }
    }

    return rows;
  });

  const renderLineHighlight = (line: string): string =>
    getFormatHandler(diagramFormat.value).highlightLine(line);

  const visibleEditorLines = computed<VisibleEditorLine[]>(() => {
    void highlightRevision.value;

    return visibleLines.value.map((item, index) => {
      const rawLine =
        item.kind === "placeholder"
          ? ""
          : (sourceLines.value[item.sourceLine - 1] ?? "");
      const text =
        item.kind === "placeholder"
          ? buildFoldPlaceholder(item.hiddenLineCount ?? 0)
          : rawLine || " ";

      const projectedLine =
        sessionProjection.value && item.kind === "source"
          ? sessionProjection.value.lines[item.sourceLine - 1]
          : undefined;

      return {
        key: `${item.kind}-${item.sourceLine}-${index}`,
        kind: item.kind,
        sourceLine: projectedLine?.workingLines[0] ?? item.sourceLine,
        text,
        sessionRole:
          projectedLine && projectedLine.role !== "context"
            ? projectedLine.role
            : null,
        html:
          item.kind === "placeholder" || !syntaxHighlightEnabled.value
            ? undefined
            : renderLineHighlight(rawLine || " "),
      };
    });
  });

  const surfaceText = computed(() => sourceLines.value.join("\n"));

  const gutterDigitCount = computed(() => {
    const numbered = gutterRows.value.reduce(
      (largest, row) => Math.max(largest, row.lineNumber ?? 0),
      lineCount.value,
    );
    return String(Math.max(numbered, 1)).length;
  });

  const editorStyle = computed(() => ({
    "--editor-font-size": editorFontSize.value,
    "--editor-font-family": editorFontFamily.value,
    "--editor-line-height": String(EDITOR_LINE_HEIGHT),
    "--editor-padding": EDITOR_PADDING,
    "--editor-tab-size": String(EDITOR_TAB_SIZE),
    "--gutter-chars": String(gutterDigitCount.value),
    "--gutter-padding-inline": GUTTER_PADDING_INLINE,
    "--gutter-item-gap": GUTTER_ITEM_GAP,
    "--gutter-border-width": GUTTER_BORDER_WIDTH,
    "--fold-toggle-width": FOLD_TOGGLE_WIDTH,
  }));

  return {
    displayText,
    surfaceText,
    surfaceFolds: displayFolds,
    visibleLines,
    gutterRows: gutterRowsWithMarkers,
    visibleEditorLines,
    editorStyle,
    useLineVirtualization,
  };
}
