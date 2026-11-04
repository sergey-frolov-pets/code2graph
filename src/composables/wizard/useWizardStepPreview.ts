import { computed, ref, type Ref } from "vue";
import type { LayoutEngine } from "@/constants";
import type { AppLocale } from "@/constants/i18n";
import {
  resolveWizardStateWithDefaults,
  type WizardState,
  type WizardStepId,
} from "@/constants/llm-wizard";
import type { RenderMode } from "@/constants/render-settings";
import { renderDiagram } from "@/formats";
import type { TranslateFn } from "@/locales/types";
import { renderGraphmlToSvg } from "@/services/graphml/graphml-engine";
import { buildManualScaffold } from "@/services/llm/wizard/manual-scaffold";
import { renderMermaidToSvg } from "@/services/mermaid/mermaid-engine";
import { renderPlantUmlPreviewSvg } from "@/utils/llm-preview";

const MANUAL_LIVE_PREVIEW_STEPS = new Set<WizardStepId>([
  "direction",
  "params",
]);

const STEP_PREVIEW_DEBOUNCE_MS = 200;

export function isLivePreviewStep(
  step: WizardStepId,
  aiMode: boolean,
): boolean {
  if (step === "type") {
    return true;
  }

  return !aiMode && MANUAL_LIVE_PREVIEW_STEPS.has(step);
}

export interface UseWizardStepPreviewOptions {
  wizardState: Ref<WizardState>;
  wizardSteps: Ref<WizardStepId[]>;
  stepIndex: Ref<number>;
  currentStepId: Ref<WizardStepId>;
  galleryVisible: Ref<boolean>;
  isAiMode: Ref<boolean>;
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
  locale: Ref<AppLocale>;
  errorMessage: Ref<string>;
  t: TranslateFn;
}

export function useWizardStepPreview(options: UseWizardStepPreviewOptions) {
  const {
    wizardState,
    wizardSteps,
    stepIndex,
    currentStepId,
    galleryVisible,
    isAiMode,
    layout,
    renderMode,
    diagramDarkMode,
    locale,
    errorMessage,
    t,
  } = options;

  const previewSvg = ref("");
  const isPreviewLoading = ref(false);
  let stepPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  let previewGeneration = 0;

  const showLivePreviewPanel = computed(() => {
    const step = currentStepId.value;
    if (isLivePreviewStep(step, isAiMode.value)) {
      return true;
    }

    return (
      step === "result" &&
      (previewSvg.value.length > 0 || isPreviewLoading.value)
    );
  });

  function clearStepPreviewTimer(): void {
    if (stepPreviewTimer) {
      clearTimeout(stepPreviewTimer);
      stepPreviewTimer = null;
    }
  }

  function resetPreviewState(): void {
    clearStepPreviewTimer();
    previewSvg.value = "";
    isPreviewLoading.value = false;
    previewGeneration += 1;
  }

  async function renderWizardPreviewSvg(source: string): Promise<string> {
    const language = wizardState.value.language;
    if (language === "graphml") {
      return renderGraphmlToSvg(source, {
        dark: diagramDarkMode.value,
        direction: wizardState.value.direction,
      });
    }

    if (language === "mermaid") {
      return renderMermaidToSvg(
        source,
        { dark: diagramDarkMode.value },
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

  async function refreshStepPreview(): Promise<void> {
    if (galleryVisible.value || currentStepId.value === "result") {
      return;
    }

    const step = currentStepId.value;
    if (!isLivePreviewStep(step, isAiMode.value)) {
      previewSvg.value = "";
      return;
    }

    const visitedSteps = wizardSteps.value.slice(0, stepIndex.value + 1);
    const resolved = resolveWizardStateWithDefaults(
      wizardState.value,
      visitedSteps,
    );
    const source = buildManualScaffold(resolved, locale.value);
    await loadPreview(source);
  }

  function scheduleStepPreview(): void {
    if (galleryVisible.value) {
      clearStepPreviewTimer();
      previewSvg.value = "";
      return;
    }

    clearStepPreviewTimer();
    stepPreviewTimer = setTimeout(() => {
      void refreshStepPreview();
    }, STEP_PREVIEW_DEBOUNCE_MS);
  }

  return {
    previewSvg,
    isPreviewLoading,
    showLivePreviewPanel,
    resetPreviewState,
    loadPreview,
    scheduleStepPreview,
  };
}
