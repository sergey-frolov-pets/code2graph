import { ref, watch, type Ref } from "vue";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { validatePlantUmlSyntax } from "@/composables/usePlantUml";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

export interface UseSyntaxValidationOptions {
  source: Ref<string>;
  layout: Ref<LayoutEngine>;
  diagramDarkMode: Ref<boolean>;
  renderMode: Ref<RenderMode>;
}

export function useSyntaxValidation(options: UseSyntaxValidationOptions) {
  const { source, layout, diagramDarkMode, renderMode } = options;

  const isValidating = ref(false);
  const syntaxResult = ref<SyntaxCheckResult | null>(null);
  const syntaxErrorLines = ref<number[]>([]);

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
    isValidating.value = true;
    syntaxResult.value = null;

    try {
      const result = await validatePlantUmlSyntax(
        source.value,
        layout.value,
        diagramDarkMode.value,
        renderMode.value,
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
  };
}
