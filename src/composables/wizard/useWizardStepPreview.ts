import { computed, ref, type Ref } from "vue";
import type { AppLocale } from "@/constants/i18n";
import type { LayoutEngine } from "@/constants";
import type { WizardState, WizardStepId } from "@/constants/llm-wizard";
import type { RenderMode } from "@/constants/render-settings";
import { renderDiagram } from "@/formats";
import type { TranslateFn } from "@/locales/types";
import { renderGraphmlToSvg } from "@/services/graphml/graphml-engine";
import { renderMermaidToSvg } from "@/services/mermaid/mermaid-engine";
import { renderPlantUmlPreviewSvg } from "@/utils/llm-preview";

export interface UseWizardStepPreviewOptions {
  wizardState: Ref<WizardState>;
  currentStepId: Ref<WizardStepId>;
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
  errorMessage: Ref<string>;
  locale: Ref<AppLocale>;
  t: TranslateFn;
}

export function useWizardStepPreview(options: UseWizardStepPreviewOptions) {
  const {
    wizardState,
    currentStepId,
    layout,
    renderMode,
    diagramDarkMode,
    errorMessage,
    locale,
    t,
  } = options;

  const previewSvg = ref("");
  const isPreviewLoading = ref(false);
  let previewGeneration = 0;

  const showLivePreviewPanel = computed(
    () =>
      (currentStepId.value === "result" ||
        currentStepId.value.startsWith("builder-")) &&
      (previewSvg.value.length > 0 ||
        isPreviewLoading.value ||
        currentStepId.value.startsWith("builder-")),
  );

  function resetPreviewState(): void {
    previewSvg.value = "";
    isPreviewLoading.value = false;
    previewGeneration += 1;
  }

  async function renderWizardPreviewSvg(source: string): Promise<string> {
    const language = wizardState.value.language;
    if (language === "graphml") {
      const isBuilderStep = currentStepId.value.startsWith("builder-");
      return renderGraphmlToSvg(source, {
        dark: diagramDarkMode.value,
        direction: isBuilderStep ? undefined : wizardState.value.direction,
      });
    }

    if (language === "mermaid") {
      return renderMermaidToSvg(
        source,
        { dark: diagramDarkMode.value, locale: locale.value },
        renderMode.value,
      );
    }

    if (language === "plantuml") {
      return renderPlantUmlPreviewSvg(
        source,
        layout.value,
        diagramDarkMode.value,
        renderMode.value,
      );
    }

    return renderDiagram(language, source, {
      layout: layout.value,
      diagramDarkMode: diagramDarkMode.value,
      renderMode: renderMode.value,
    });
  }

  async function loadPreview(source: string): Promise<void> {
    const generation = ++previewGeneration;
    isPreviewLoading.value = true;
    try {
      const svg = await renderWizardPreviewSvg(source);
      if (generation !== previewGeneration) {
        return;
      }

      previewSvg.value = svg;
    } catch (error) {
      if (generation !== previewGeneration) {
        return;
      }

      previewSvg.value = "";
      errorMessage.value =
        error instanceof Error ? error.message : t("llm.wizard.previewError");
    } finally {
      if (generation === previewGeneration) {
        isPreviewLoading.value = false;
      }
    }
  }

  return {
    previewSvg,
    isPreviewLoading,
    showLivePreviewPanel,
    resetPreviewState,
    loadPreview,
  };
}
