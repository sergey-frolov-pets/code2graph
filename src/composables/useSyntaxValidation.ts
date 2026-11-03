import { computed, ref, watch, type Ref } from "vue";
import type { LayoutEngine } from "@/constants";
import {
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import type { RenderMode } from "@/constants/render-settings";
import { validateDiagramSyntax } from "@/formats";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

export interface UseSyntaxValidationOptions {
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  layout: Ref<LayoutEngine>;
  diagramDarkMode: Ref<boolean>;
  renderMode: Ref<RenderMode>;
}

export function useSyntaxValidation(options: UseSyntaxValidationOptions) {
  const { source, diagramFormat, layout, diagramDarkMode, renderMode } = options;

  const isValidating = ref(false);
  const syntaxResult = ref<SyntaxCheckResult | null>(null);
  const syntaxErrorLines = ref<number[]>([]);

  const supportsSyntaxValidation = computed(
    () =>
      getDiagramFormatDefinition(diagramFormat.value).supportsSyntaxValidation,
  );

  function updateSyntaxHighlights(result: SyntaxCheckResult | null): void {
    if (!result || result.valid) {
      syntaxErrorLines.value = [];
      return;
    }

    syntaxErrorLines.value = [
      ...new Set(
        result.issues
          .map((issue) => issue.line)
          .filter((line): line is number => typeof line === "number"),
      ),
    ];
  }

  async function validateSyntax(): Promise<SyntaxCheckResult> {
    if (!supportsSyntaxValidation.value) {
      const unsupportedResult: SyntaxCheckResult = {
        valid: true,
        issues: [],
      };
      syntaxResult.value = unsupportedResult;
      updateSyntaxHighlights(unsupportedResult);
      return unsupportedResult;
    }

    isValidating.value = true;
    syntaxResult.value = null;

    try {
      const result = await validateDiagramSyntax(
        diagramFormat.value,
        source.value,
        {
          layout: layout.value,
          diagramDarkMode: diagramDarkMode.value,
          renderMode: renderMode.value,
        },
      );
      syntaxResult.value = result;
      updateSyntaxHighlights(result);
      return result;
    } finally {
      isValidating.value = false;
    }
  }

  watch(source, () => {
    if (syntaxErrorLines.value.length > 0) {
      syntaxErrorLines.value = [];
    }
  });

  return {
    isValidating,
    syntaxResult,
    syntaxErrorLines,
    validateSyntax,
    updateSyntaxHighlights,
    supportsSyntaxValidation,
  };
}
