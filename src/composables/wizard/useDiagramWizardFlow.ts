import { computed, ref, watch, type Ref } from "vue";
import { useWizardStepPreview } from "@/composables/wizard/useWizardStepPreview";
import type { LayoutEngine } from "@/constants";
import type { DiagramExample } from "@/constants/diagram-example-catalog";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { AppLocale } from "@/constants/i18n";
import {
  createDefaultStructuralElements,
  createDefaultTypeParams,
  DEFAULT_WIZARD_STATE,
  getWizardStepTitleKey,
  isWizardDiagramType,
  type WizardState,
  type WizardStepId,
} from "@/constants/llm-wizard";
import type { RenderMode } from "@/constants/render-settings";
import { getSampleSource } from "@/constants/sample-diagrams";
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import type { TranslateFn } from "@/locales/types";
import {
  createDefaultBuilderState,
  emitSourceFromBuilderState,
  getDiagramBuilderSchema,
  hasBuilderOptionsCapabilities,
  parseSourceToBuilderState,
  supportsDiagramBuilder,
  type BuilderApplyTarget,
  type DiagramBuilderState,
} from "@/services/diagram-builder";

const BUILDER_WIZARD_FLOW_STEPS: readonly WizardStepId[] = [
  "builder-data",
  "builder-canvas",
];

export interface UseDiagramWizardFlowOptions {
  open: Ref<boolean>;
  documentKey: Ref<string>;
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
  locale: Ref<AppLocale>;
  t: TranslateFn;
  onApply: (payload: {
    source: string;
    label: string;
    format: DiagramFormat;
    target?: BuilderApplyTarget;
  }) => void;
  onClose: () => void;
}

/**
 * Мастер новой диаграммы без ИИ: галерея примеров («В редактор»)
 * и пошаговый конструктор. Диалоговая работа с ИИ — только режим
 * «ИИ-чат» редактора.
 */
export function useDiagramWizardFlow(options: UseDiagramWizardFlowOptions) {
  const {
    open,
    layout,
    renderMode,
    diagramDarkMode,
    locale,
    t,
    onApply,
    onClose,
  } = options;

  const stepIndex = ref(0);
  const galleryVisible = ref(true);
  const wizardState = ref<WizardState>({
    ...DEFAULT_WIZARD_STATE,
    creationMode: "builder",
    typeParams: createDefaultTypeParams(),
    structuralElements: createDefaultStructuralElements(),
  });
  const builderState = ref<DiagramBuilderState>(
    createDefaultBuilderState("mermaid", "waterfall"),
  );
  const builderBaseSource = ref("");
  const applyTarget = ref<BuilderApplyTarget>("new-tab");

  const errorMessage = ref("");
  const resultSource = ref("");

  const isBuilderMode = computed(
    () => wizardState.value.creationMode === "builder",
  );

  const wizardSteps = computed((): WizardStepId[] => {
    const schema = getDiagramBuilderSchema(
      builderState.value.format,
      builderState.value.diagramType,
    );
    if (hasBuilderOptionsCapabilities(schema.capabilities)) {
      return [...BUILDER_WIZARD_FLOW_STEPS, "builder-options"];
    }
    return [...BUILDER_WIZARD_FLOW_STEPS];
  });
  const currentStepId = computed(
    (): WizardStepId => wizardSteps.value[stepIndex.value] ?? "builder-data",
  );
  const totalSteps = computed(() => wizardSteps.value.length);

  const stepTitle = computed(() =>
    t(getWizardStepTitleKey(currentStepId.value)),
  );

  const showBackButton = computed(() => !galleryVisible.value);

  const {
    previewSvg,
    isPreviewLoading,
    showLivePreviewPanel,
    resetPreviewState,
    loadPreview,
  } = useWizardStepPreview({
    wizardState,
    currentStepId,
    layout,
    renderMode,
    diagramDarkMode,
    errorMessage,
    t,
  });

  const canGoNext = computed(
    () => stepIndex.value < totalSteps.value - 1,
  );

  let builderPreviewTimer: ReturnType<typeof setTimeout> | null = null;

  function syncBuilderToSource(immediate = false): void {
    if (
      builderState.value.canvas.direction === "TB" ||
      builderState.value.canvas.direction === "LR"
    ) {
      wizardState.value.direction = builderState.value.canvas.direction;
    }
    const emitted = emitSourceFromBuilderState(
      builderState.value,
      builderBaseSource.value,
    );
    resultSource.value = emitted;
    errorMessage.value = "";

    if (builderPreviewTimer) {
      clearTimeout(builderPreviewTimer);
      builderPreviewTimer = null;
    }

    if (immediate) {
      void loadPreview(emitted);
    } else {
      builderPreviewTimer = setTimeout(() => {
        void loadPreview(emitted);
      }, 120);
    }
  }

  function handleBuilderChange(): void {
    syncBuilderToSource(false);
  }

  watch(currentStepId, (step, previous) => {
    if (!isBuilderMode.value || galleryVisible.value || step === previous) {
      return;
    }
    if (step.startsWith("builder-")) {
      syncBuilderToSource(true);
    }
  });

  function handleBuilderPasteSource(pastedFullSource: string): void {
    builderBaseSource.value = pastedFullSource;
    builderState.value = parseSourceToBuilderState(
      pastedFullSource,
      builderState.value.format,
      builderState.value.diagramType,
    );
    syncBuilderToSource(true);
  }

  function openBuilderForType(input: {
    format: DiagramFormat;
    diagramType: DiagramBuilderState["diagramType"];
    target: BuilderApplyTarget;
  }): void {
    if (!supportsDiagramBuilder(input.format)) {
      return;
    }

    const wizType = isWizardDiagramType(input.diagramType)
      ? input.diagramType
      : "flowchart";

    wizardState.value = {
      ...DEFAULT_WIZARD_STATE,
      creationMode: "builder",
      language: input.format,
      diagramType: wizType,
      typeParams: createDefaultTypeParams(),
      structuralElements: createDefaultStructuralElements(),
    };
    builderBaseSource.value = "";
    builderState.value = createDefaultBuilderState(
      input.format,
      input.diagramType,
    );
    applyTarget.value = input.target;
    stepIndex.value = 0;
    galleryVisible.value = false;
    syncBuilderToSource(true);
  }

  function resetWizard(): void {
    stepIndex.value = 0;
    galleryVisible.value = true;
    applyTarget.value = "new-tab";
    wizardState.value = {
      ...DEFAULT_WIZARD_STATE,
      creationMode: "builder",
      typeParams: createDefaultTypeParams(),
      structuralElements: createDefaultStructuralElements(),
    };
    errorMessage.value = "";
    resultSource.value = "";
    resetPreviewState();
  }

  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        resetWizard();
      }
    },
    { immediate: true },
  );

  function openGalleryExample(payload: {
    example: DiagramExample;
    action: GalleryExampleAction;
    label: string;
    prompt: string;
  }): void {
    if (payload.action === "builder") {
      openBuilderForType({
        format: payload.example.format,
        diagramType: payload.example.diagramType,
        target: "new-tab",
      });
      return;
    }

    const sampleSource = getSampleSource(
      { format: payload.example.format, id: payload.example.sampleId },
      locale.value,
    );

    onApply({
      source: sampleSource,
      label: payload.label,
      format: payload.example.format,
      target: "new-tab",
    });
    onClose();
  }

  function openSavedDiagram(payload: {
    source: string;
    label: string;
    format: DiagramFormat;
  }): void {
    onApply({
      source: payload.source,
      label: payload.label,
      format: payload.format,
      target: "new-tab",
    });
    onClose();
  }

  function selectStep(index: number): void {
    if (
      !isBuilderMode.value ||
      index < 0 ||
      index >= totalSteps.value
    ) {
      return;
    }
    stepIndex.value = index;
  }

  function goBack(): void {
    if (galleryVisible.value) {
      return;
    }

    if (stepIndex.value > 0) {
      stepIndex.value -= 1;
      return;
    }

    galleryVisible.value = true;
  }

  function goNext(): void {
    if (canGoNext.value && stepIndex.value < totalSteps.value - 1) {
      stepIndex.value += 1;
    }
  }

  function buildApplyLabel(state: WizardState): string {
    return t("llm.wizard.historyLabel", {
      mode: t("llm.wizard.gallery.action.builder"),
      type: t(`llm.wizard.type.${state.diagramType}`),
    });
  }

  function handleApply(): void {
    if (!resultSource.value) {
      return;
    }

    onApply({
      source: resultSource.value,
      label: buildApplyLabel(wizardState.value),
      format: wizardState.value.language,
      target: applyTarget.value,
    });
    onClose();
  }

  return {
    stepIndex,
    galleryVisible,
    wizardState,
    builderState,
    applyTarget,
    isBuilderMode,
    errorMessage,
    resultSource,
    previewSvg,
    isPreviewLoading,
    showLivePreviewPanel,
    wizardSteps,
    currentStepId,
    totalSteps,
    stepTitle,
    showBackButton,
    canGoNext,
    openGalleryExample,
    openSavedDiagram,
    handleBuilderChange,
    handleBuilderPasteSource,
    selectStep,
    goBack,
    goNext,
    handleApply,
  };
}
