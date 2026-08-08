import { computed, type Ref } from "vue";
import {
  buildDisplayText,
  buildFoldPlaceholder,
  buildVisibleLines,
  type CodeFoldRegion,
  type VisibleLine,
} from "@/utils/code-folds";
import { renderHighlightedLine } from "@/utils/plantuml-highlight";
import { renderMermaidHighlightedLine } from "@/utils/mermaid-highlight";
import { renderGraphmlHighlightedLine } from "@/utils/graphml-highlight";
import type { DiagramFormat } from "@/constants/diagram-formats";

export const EDITOR_LINE_HEIGHT = 1.45;
export const FOLD_TOGGLE_WIDTH = "14px";
export const EDITOR_PADDING = "12px";
export const GUTTER_PADDING_INLINE = "6px";

export interface GutterRow {
  key: string;
  sourceLine: number;
  lineNumber: number | null;
  visibleLine: VisibleLine;
  fold: CodeFoldRegion | null;
}

export interface VisibleEditorLine {
  key: string;
  kind: VisibleLine["kind"];
  sourceLine: number;
  text: string;
  html?: string;
}

export function useEditorDisplayModel(options: {
  source: Ref<string>;
  folds: Ref<CodeFoldRegion[]>;
  syntaxHighlightEnabled: Ref<boolean>;
  diagramFormat: Ref<DiagramFormat>;
  editorFontSize: Ref<string>;
  editorFontFamily: Ref<string>;
}) {
  const {
    source,
    folds,
    syntaxHighlightEnabled,
    diagramFormat,
    editorFontSize,
    editorFontFamily,
  } = options;

  const sourceLines = computed(() => source.value.split(/\r?\n/));

  const lineCount = computed(() => Math.max(sourceLines.value.length, 1));

  const displayText = computed(() =>
    buildDisplayText(sourceLines.value, folds.value),
  );

  const visibleLines = computed(() =>
    buildVisibleLines(lineCount.value, folds.value),
  );

  const foldsByStartLine = computed(() => {
    const map = new Map<number, CodeFoldRegion>();

    for (const fold of folds.value) {
      map.set(fold.startLine, fold);
    }

    return map;
  });

  const gutterRows = computed<GutterRow[]>(() =>
    visibleLines.value.map((visibleLine, index) => ({
      key: `${visibleLine.kind}-${visibleLine.sourceLine}-${index}`,
      sourceLine: visibleLine.sourceLine,
      lineNumber:
        visibleLine.kind === "source" ? visibleLine.sourceLine : null,
      visibleLine,
      fold:
        visibleLine.kind === "source"
          ? (foldsByStartLine.value.get(visibleLine.sourceLine) ?? null)
          : null,
    })),
  );

  const renderLineHighlight = (line: string): string => {
    if (diagramFormat.value === "mermaid") {
      return renderMermaidHighlightedLine(line);
    }

    if (diagramFormat.value === "graphml") {
      return renderGraphmlHighlightedLine(line);
    }

    return renderHighlightedLine(line);
  };

  const visibleEditorLines = computed<VisibleEditorLine[]>(() =>
    visibleLines.value.map((item, index) => {
      const rawLine =
        item.kind === "placeholder"
          ? ""
          : (sourceLines.value[item.sourceLine - 1] ?? "");
      const text =
        item.kind === "placeholder"
          ? buildFoldPlaceholder(item.hiddenLineCount ?? 0)
          : rawLine || " ";

      return {
        key: `${item.kind}-${item.sourceLine}-${index}`,
        kind: item.kind,
        sourceLine: item.sourceLine,
        text,
        html:
          item.kind === "placeholder" || !syntaxHighlightEnabled.value
            ? undefined
            : renderLineHighlight(rawLine || " "),
      };
    }),
  );

  const gutterDigitCount = computed(() => String(lineCount.value).length);

  const editorStyle = computed(() => ({
    "--editor-font-size": editorFontSize.value,
    "--editor-font-family": editorFontFamily.value,
    "--editor-line-height": String(EDITOR_LINE_HEIGHT),
    "--editor-padding": EDITOR_PADDING,
    "--gutter-chars": String(gutterDigitCount.value),
    "--gutter-padding-inline": GUTTER_PADDING_INLINE,
    "--fold-toggle-width": FOLD_TOGGLE_WIDTH,
  }));

  return {
    displayText,
    visibleLines,
    gutterRows,
    visibleEditorLines,
    editorStyle,
  };
}
