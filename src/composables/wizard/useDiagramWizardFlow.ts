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
  type WizardState,
  type WizardStepId,
} from "@/constants/llm-wizard";
import type { RenderMode } from "@/constants/render-settings";
import { getSampleSource } from "@/constants/sample-diagrams";
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import type { TranslateFn } from "@/locales/types";
import { buildWizardPrompt } from "@/services/llm/wizard/wizard-prompts";

const WIZARD_FLOW_STEPS: readonly WizardStepId[] = ["context", "result"];

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
    creationMode: "ai",
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

  const wizardSteps = computed((): WizardStepId[] => [...WIZARD_FLOW_STEPS]);
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

  const showBackButton = computed(() => !galleryVisible.value);

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

  function resetWizard(): void {
    stepIndex.value = 0;
    galleryVisible.value = true;
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
  }

  watch(open, (isOpen) => {
    if (isOpen) {
      resetWizard();
    }
  });

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
    return t("llm.wizard.historyLabel", {
      mode: t("llm.wizard.mode.ai"),
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
