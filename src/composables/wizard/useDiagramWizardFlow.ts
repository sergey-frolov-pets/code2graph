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
  getWizardLanguagesForMode,
  getWizardStepTitleKey,
  getWizardSteps,
  getWizardStructuralElementsForType,
  getWizardTypesForLanguage,
  resolveWizardStateWithDefaults,
  WIZARD_DIAGRAM_DIRECTIONS,
  WIZARD_TYPE_PARAM_FIELDS,
  type WizardParamField,
  type WizardState,
  type WizardStructuralElementId,
} from "@/constants/llm-wizard";
import type { RenderMode } from "@/constants/render-settings";
import { getSampleSource } from "@/constants/sample-diagrams";
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import type { TranslateFn } from "@/locales/types";
import { buildManualScaffold } from "@/services/llm/wizard/manual-scaffold";
import { buildWizardPrompt } from "@/services/llm/wizard/wizard-prompts";

export interface UseDiagramWizardFlowOptions {
  open: Ref<boolean>;
  documentKey: Ref<string>;
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
  locale: Ref<AppLocale>;
  t: TranslateFn;
  onApply: (payload: { source: string; label: string; format: DiagramFormat }) => void;
  onClose: () => void;
}

export function useDiagramWizardFlow(options: UseDiagramWizardFlowOptions) {
  const {
    open,
    documentKey,
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
    typeParams: createDefaultTypeParams(),
    structuralElements: createDefaultStructuralElements(),
  });
  const isGenerating = ref(false);
  const errorMessage = ref("");
  const resultSource = ref("");
  const resultExplanation = ref("");
  const aiSetupVisible = ref(false);
  const aiSetupReason = ref<LlmGateFailureReason | null>(null);

  const { llmConsent, llmProviderId } = useLlmSettings();
  const { hasLlmApiKey } = useLlmApiKeys();

  const wizardSteps = computed(() => getWizardSteps(wizardState.value));
  const currentStepId = computed(() => wizardSteps.value[stepIndex.value] ?? "mode");
  const totalSteps = computed(() => wizardSteps.value.length);
  const isAiMode = computed(() => wizardState.value.creationMode === "ai");

  const stepTitle = computed(() => {
    if (currentStepId.value === "context" && isAiMode.value) {
      return t("llm.wizard.step.description");
    }

    return t(getWizardStepTitleKey(currentStepId.value));
  });

  const structuralElementOptions = computed(() =>
    getWizardStructuralElementsForType(
      wizardState.value.diagramType,
      wizardState.value.language,
    ).map((id) => ({
      id,
      label: t(`llm.wizard.structural.${id}`),
    })),
  );

  const showBackButton = computed(() => !galleryVisible.value);

  const directionOptions = computed(() =>
    WIZARD_DIAGRAM_DIRECTIONS.map((id) => ({
      id,
      label: t(`llm.wizard.direction.${id}`),
    })),
  );

  const paramFields = computed((): WizardParamField[] =>
    WIZARD_TYPE_PARAM_FIELDS[wizardState.value.diagramType],
  );

  const isManualResultReady = computed(
    () =>
      !isAiMode.value &&
      currentStepId.value === "result" &&
      resultSource.value.length > 0,
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
    scheduleStepPreview,
  } = useWizardStepPreview({
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
    isAiMode,
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

    if (currentStepId.value === "prompt") {
      return wizardState.value.promptText.trim().length > 0;
    }

    return stepIndex.value < totalSteps.value - 1;
  });

  function resetWizard(): void {
    stepIndex.value = 0;
    galleryVisible.value = true;
    wizardState.value = {
      ...DEFAULT_WIZARD_STATE,
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
  }

  function clampStepIndex(): void {
    const maxIndex = Math.max(0, wizardSteps.value.length - 1);
    if (stepIndex.value > maxIndex) {
      stepIndex.value = maxIndex;
    }
  }

  function syncLanguageForMode(): void {
    const allowed = getWizardLanguagesForMode(wizardState.value.creationMode);
    if (!allowed.includes(wizardState.value.language)) {
      wizardState.value.language = allowed[0];
    }
  }

  function syncTypeForLanguage(): void {
    const allowed = getWizardTypesForLanguage(wizardState.value.language);
    if (!allowed.includes(wizardState.value.diagramType)) {
      wizardState.value.diagramType = allowed[0];
    }
  }

  watch(open, (isOpen) => {
    if (isOpen) {
      resetWizard();
    }
  });

  watch(
    () => wizardState.value.creationMode,
    () => {
      syncLanguageForMode();
      syncTypeForLanguage();
      clampStepIndex();
    },
  );

  watch(
    () => wizardState.value.language,
    () => {
      syncTypeForLanguage();
      clampStepIndex();
    },
  );

  watch(
    () => wizardState.value.diagramType,
    () => {
      wizardState.value.structuralElements = createDefaultStructuralElements();
      clampStepIndex();
    },
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

  watch(galleryVisible, () => {
    scheduleStepPreview();
  });

  watch(currentStepId, (step) => {
    if (galleryVisible.value) {
      return;
    }

    if (isAiMode.value && step === "context") {
      void checkAiAccess();
    }

    scheduleStepPreview();
  });

  watch(
    () => [
      wizardState.value.diagramType,
      wizardState.value.direction,
      wizardState.value.theme,
      wizardState.value.typeParams,
      wizardState.value.structuralElements,
      wizardState.value.language,
    ],
    scheduleStepPreview,
    { deep: true },
  );

  function openGalleryExample(payload: {
    example: DiagramExample;
    action: GalleryExampleAction;
    label: string;
    prompt: string;
  }): void {
    if (payload.action === "editor") {
      onApply({
        source: getSampleSource(
          { format: payload.example.format, id: payload.example.sampleId },
          locale.value,
        ),
        label: payload.label,
        format: payload.example.format,
      });
      onClose();
      return;
    }

    wizardState.value = {
      ...DEFAULT_WIZARD_STATE,
      creationMode: payload.action === "llm" ? "ai" : "manual",
      language: payload.example.format,
      diagramType: payload.example.wizardType,
      direction: exampleDirection(payload.example),
      typeParams: createDefaultTypeParams(),
      structuralElements: createDefaultStructuralElements(),
      contextText: payload.action === "llm" ? payload.prompt : "",
      typeSpecificText: "",
      promptText: "",
    };
    stepIndex.value = 0;
    galleryVisible.value = false;
  }

  function onDirectionSelect(direction: WizardState["direction"]): void {
    wizardState.value.direction = direction;
  }

  function onParamChange(paramId: WizardParamField["id"], event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const field = paramFields.value.find((item) => item.id === paramId);
    if (!field || Number.isNaN(raw)) {
      return;
    }

    wizardState.value.typeParams[paramId] = Math.min(
      field.max,
      Math.max(field.min, raw),
    );
  }

  function onStructuralToggle(
    elementId: WizardStructuralElementId,
    event: Event,
  ): void {
    wizardState.value.structuralElements[elementId] = (
      event.target as HTMLInputElement
    ).checked;
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

  async function prepareManualResult(): Promise<void> {
    errorMessage.value = "";
    resultExplanation.value = "";
    resultSource.value = buildManualScaffold(wizardState.value, locale.value);
    await loadPreview(resultSource.value);
  }

  function goNext(): void {
    if (currentStepId.value === "context" && isAiMode.value) {
      wizardState.value.promptText = buildWizardPrompt(
        wizardState.value,
        locale.value,
      );
      stepIndex.value += 1;
      void generateDiagram();
      return;
    }

    if (currentStepId.value === "prompt") {
      wizardState.value.promptText =
        wizardState.value.promptText.trim() ||
        buildWizardPrompt(wizardState.value, locale.value);
      stepIndex.value += 1;
      void generateDiagram();
      return;
    }

    if (currentStepId.value === "params" && !isAiMode.value) {
      stepIndex.value += 1;
      void prepareManualResult();
      return;
    }

    if (canGoNext.value && stepIndex.value < totalSteps.value - 1) {
      stepIndex.value += 1;
    }
  }

  function buildApplyLabel(state: WizardState): string {
    const modeLabel =
      state.creationMode === "ai"
        ? t("llm.wizard.mode.ai")
        : t("llm.wizard.mode.manual");

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
    });
    onClose();
  }

  function handleTransferToEditor(): void {
    const visitedSteps = wizardSteps.value.slice(0, stepIndex.value + 1);
    const resolved = resolveWizardStateWithDefaults(
      wizardState.value,
      visitedSteps,
    );
    const source = buildManualScaffold(resolved, locale.value);

    onApply({
      source,
      label: buildApplyLabel(resolved),
      format: resolved.language,
    });
    onClose();
  }

  function handleRegenerate(): void {
    if (isAiMode.value) {
      void generateDiagram();
      return;
    }

    void prepareManualResult();
  }

  async function handleAiSetupRetry(): Promise<void> {
    const hasAccess = await checkAiAccess();
    if (!hasAccess) {
      return;
    }

    if (
      isAiMode.value &&
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
    structuralElementOptions,
    showBackButton,
    directionOptions,
    paramFields,
    isAiMode,
    isManualResultReady,
    canGoNext,
    openGalleryExample,
    onDirectionSelect,
    onParamChange,
    onStructuralToggle,
    goBack,
    goNext,
    handleApply,
    handleTransferToEditor,
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
