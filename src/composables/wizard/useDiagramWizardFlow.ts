import { computed, ref, watch, type Ref } from "vue";
import { useLlmApiKeys } from "@/composables/useLlmApiKeys";
import {
  useLlmGate,
  type LlmGateFailureReason,
} from "@/composables/useLlmGate";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useWizardAiChat } from "@/composables/wizard/useWizardAiChat";
import { useWizardStepPreview } from "@/composables/wizard/useWizardStepPreview";
import type { LayoutEngine } from "@/constants";
import {
  exampleDirection,
  type DiagramExample,
} from "@/constants/diagram-example-catalog";
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
  detectBuilderDiagramType,
  emitSourceFromBuilderState,
  getDiagramBuilderSchema,
  hasBuilderOptionsCapabilities,
  parseSourceToBuilderState,
  supportsDiagramBuilder,
  type BuilderApplyTarget,
  type DiagramBuilderState,
} from "@/services/diagram-builder";
import { buildWizardPrompt } from "@/services/llm/wizard/wizard-prompts";

const AI_WIZARD_FLOW_STEPS: readonly WizardStepId[] = ["context", "result"];
const BUILDER_WIZARD_FLOW_STEPS: readonly WizardStepId[] = [
  "builder-data",
  "builder-canvas",
  "builder-options",
];

export interface UseDiagramWizardFlowOptions {
  open: Ref<boolean>;
  documentKey: Ref<string>;
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
  currentEditorSource?: Ref<string>;
  currentEditorFormat?: Ref<DiagramFormat>;
  startInBuilder?: Ref<boolean>;
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

export function useDiagramWizardFlow(options: UseDiagramWizardFlowOptions) {
  const {
    open,
    documentKey,
    layout,
    renderMode,
    diagramDarkMode,
    currentEditorSource,
    currentEditorFormat,
    startInBuilder,
    locale,
    t,
    onApply,
    onClose,
  } = options;

  const stepIndex = ref(0);
  const galleryVisible = ref(true);
  const wizardState = ref<WizardState>({
    ...DEFAULT_WIZARD_STATE,
    creationMode: "ai",
    typeParams: createDefaultTypeParams(),
    structuralElements: createDefaultStructuralElements(),
  });
  const builderState = ref<DiagramBuilderState>(
    createDefaultBuilderState("mermaid", "waterfall"),
  );
  const builderBaseSource = ref("");
  const applyTarget = ref<BuilderApplyTarget>("new-tab");

  const isGenerating = ref(false);
  const errorMessage = ref("");
  const resultSource = ref("");
  const resultExplanation = ref("");
  const aiSetupVisible = ref(false);
  const aiSetupReason = ref<LlmGateFailureReason | null>(null);

  const { llmConsent, llmProviderId } = useLlmSettings();
  const { hasLlmApiKey } = useLlmApiKeys();

  const isBuilderMode = computed(
    () => wizardState.value.creationMode === "builder",
  );

  const wizardSteps = computed((): WizardStepId[] => {
    if (!isBuilderMode.value) {
      return [...AI_WIZARD_FLOW_STEPS];
    }
    const schema = getDiagramBuilderSchema(
      builderState.value.format,
      builderState.value.diagramType,
    );
    return hasBuilderOptionsCapabilities(schema.capabilities)
      ? [...BUILDER_WIZARD_FLOW_STEPS]
      : ["builder-data", "builder-canvas"];
  });
  const currentStepId = computed(
    (): WizardStepId => wizardSteps.value[stepIndex.value] ?? "context",
  );
  const totalSteps = computed(() => wizardSteps.value.length);

  const stepTitle = computed(() => {
    if (currentStepId.value === "context") {
      return t("llm.wizard.step.description");
    }

    return t(getWizardStepTitleKey(currentStepId.value));
  });

  const showBackButton = computed(
    () =>
      !galleryVisible.value &&
      (!startInBuilder?.value || stepIndex.value > 0),
  );

  async function checkAiAccess(): Promise<boolean> {
    const { requireLlmAccess } = useLlmGate();
    const gate = await requireLlmAccess({ silent: true });

    if (!gate.ok) {
      aiSetupReason.value = gate.reason;
      aiSetupVisible.value = true;
      return false;
    }

    aiSetupVisible.value = false;
    aiSetupReason.value = null;
    return true;
  }

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

  const {
    planningMessages,
    isPlanningChatBusy,
    sendPlanningChatMessage,
    clearPlanningChat,
    refineMessages,
    isRefineChatBusy,
    sendRefineChatMessage,
    clearRefineChat,
    showRefineChat,
    clearConversations,
    generateDiagram,
  } = useWizardAiChat({
    documentKey,
    wizardState,
    currentStepId,
    layout,
    renderMode,
    diagramDarkMode,
    locale,
    isGenerating,
    errorMessage,
    resultSource,
    resultExplanation,
    previewSvg,
    aiSetupVisible,
    aiSetupReason,
    checkAiAccess,
    loadPreview,
    t,
  });

  const canGoNext = computed(() => {
    if (currentStepId.value === "context") {
      return (
        wizardState.value.contextText.trim().length > 0 ||
        planningMessages.value.length > 0
      );
    }

    return stepIndex.value < totalSteps.value - 1;
  });

  let builderPreviewTimer: ReturnType<typeof setTimeout> | null = null;

  function syncBuilderToSource(immediate = false): void {
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
    aiSetupVisible.value = false;
    aiSetupReason.value = null;
    syncBuilderToSource(true);
  }

  function openBuilderForSource(input: {
    source: string;
    format: DiagramFormat;
    diagramType?: DiagramBuilderState["diagramType"];
    target: BuilderApplyTarget;
  }): void {
    if (!supportsDiagramBuilder(input.format)) {
      return;
    }

    const detectedType =
      input.diagramType ?? detectBuilderDiagramType(input.source, input.format);
    const wizType = isWizardDiagramType(detectedType)
      ? detectedType
      : "flowchart";

    wizardState.value = {
      ...DEFAULT_WIZARD_STATE,
      creationMode: "builder",
      language: input.format,
      diagramType: wizType,
      typeParams: createDefaultTypeParams(),
      structuralElements: createDefaultStructuralElements(),
    };
    builderBaseSource.value = input.source;
    builderState.value = parseSourceToBuilderState(
      input.source,
      input.format,
      detectedType,
    );
    applyTarget.value = input.target;
    stepIndex.value = 0;
    galleryVisible.value = false;
    aiSetupVisible.value = false;
    aiSetupReason.value = null;
    syncBuilderToSource(true);
  }

  function openCurrentDiagramInBuilder(): void {
    const src = currentEditorSource?.value ?? "";
    const fmt = currentEditorFormat?.value ?? "plantuml";
    if (!supportsDiagramBuilder(fmt)) {
      return;
    }
    openBuilderForSource({
      source: src,
      format: fmt,
      target: "current",
    });
  }

  function resetWizard(): void {
    stepIndex.value = 0;
    galleryVisible.value = true;
    applyTarget.value = "new-tab";
    wizardState.value = {
      ...DEFAULT_WIZARD_STATE,
      creationMode: "ai",
      typeParams: createDefaultTypeParams(),
      structuralElements: createDefaultStructuralElements(),
    };
    isGenerating.value = false;
    errorMessage.value = "";
    resultSource.value = "";
    resultExplanation.value = "";
    resetPreviewState();
    aiSetupVisible.value = false;
    aiSetupReason.value = null;
    clearConversations();

    if (startInBuilder?.value) {
      openCurrentDiagramInBuilder();
    }
  }

  watch(
    [open, () => startInBuilder?.value],
    ([isOpen]) => {
      if (isOpen) {
        resetWizard();
      }
    },
    { immediate: true },
  );

  watch([llmConsent, llmProviderId], () => {
    if (aiSetupVisible.value) {
      void checkAiAccess();
    }
  });

  watch(
    () => hasLlmApiKey(llmProviderId.value),
    () => {
      if (aiSetupVisible.value) {
        void checkAiAccess();
      }
    },
  );

  watch([galleryVisible, currentStepId], ([inGallery, step]) => {
    if (!inGallery && step === "context") {
      void checkAiAccess();
    }
  });

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

    if (payload.action === "editor") {
      onApply({
        source: sampleSource,
        label: payload.label,
        format: payload.example.format,
        target: "new-tab",
      });
      onClose();
      return;
    }

    applyTarget.value = "new-tab";
    wizardState.value = {
      ...DEFAULT_WIZARD_STATE,
      creationMode: "ai",
      language: payload.example.format,
      diagramType: payload.example.wizardType,
      direction: exampleDirection(payload.example),
      typeParams: createDefaultTypeParams(),
      structuralElements: createDefaultStructuralElements(),
      contextText: payload.prompt,
      typeSpecificText: "",
      promptText: "",
    };
    stepIndex.value = 0;
    galleryVisible.value = false;
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
    if (isGenerating.value || galleryVisible.value) {
      return;
    }

    if (stepIndex.value > 0) {
      stepIndex.value -= 1;
      return;
    }

    galleryVisible.value = true;
  }

  function goNext(): void {
    if (currentStepId.value === "context") {
      wizardState.value.promptText = buildWizardPrompt(
        wizardState.value,
        locale.value,
      );
      stepIndex.value += 1;
      void generateDiagram();
      return;
    }

    if (canGoNext.value && stepIndex.value < totalSteps.value - 1) {
      stepIndex.value += 1;
    }
  }

  function buildApplyLabel(state: WizardState): string {
    const modeLabel =
      state.creationMode === "builder"
        ? t("llm.wizard.gallery.action.builder")
        : t("llm.wizard.mode.ai");
    return t("llm.wizard.historyLabel", {
      mode: modeLabel,
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

  function handleRegenerate(): void {
    void generateDiagram();
  }

  async function handleAiSetupRetry(): Promise<void> {
    const hasAccess = await checkAiAccess();
    if (!hasAccess) {
      return;
    }

    if (
      currentStepId.value === "result" &&
      !resultSource.value &&
      !isGenerating.value
    ) {
      void generateDiagram();
    }
  }

  return {
    stepIndex,
    galleryVisible,
    wizardState,
    builderState,
    applyTarget,
    isBuilderMode,
    isGenerating,
    errorMessage,
    resultSource,
    resultExplanation,
    previewSvg,
    isPreviewLoading,
    aiSetupVisible,
    aiSetupReason,
    showLivePreviewPanel,
    wizardSteps,
    currentStepId,
    totalSteps,
    stepTitle,
    showBackButton,
    canGoNext,
    openGalleryExample,
    openCurrentDiagramInBuilder,
    handleBuilderChange,
    handleBuilderPasteSource,
    selectStep,
    goBack,
    goNext,
    handleApply,
    handleRegenerate,
    handleAiSetupRetry,
    planningMessages,
    isPlanningChatBusy,
    sendPlanningChatMessage,
    clearPlanningChat,
    refineMessages,
    isRefineChatBusy,
    sendRefineChatMessage,
    clearRefineChat,
    showRefineChat,
  };
}
