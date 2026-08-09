import { computed, ref, watch, type Ref } from "vue";
import type { TranslateFn } from "@/locales/types";
import { generateValidWizardDiagram } from "@/services/llm/llm-plantuml-generate";
import { generateValidPlantUmlFullEdit } from "@/services/llm/llm-plantuml-edit";
import {
  buildWizardPromptWithChatContext,
  sendWizardPlanningChat,
} from "@/services/llm/llm-wizard-chat";
import { useLlmConversation } from "@/composables/useLlmConversation";
import { toLlmChatMessages } from "@/utils/llm-edit-conversation";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import {
  buildManualScaffold,
  buildWizardPrompt,
  createDefaultStructuralElements,
  createDefaultTypeParams,
  DEFAULT_WIZARD_STATE,
  getWizardLanguagesForMode,
  getWizardStepTitleKey,
  getWizardSteps,
  getWizardStructuralElementsForType,
  getWizardTypesForLanguage,
  isWizardDiagramType,
  isWizardLanguage,
  resolveWizardStateWithDefaults,
  WIZARD_DIAGRAM_DIRECTIONS,
  WIZARD_TYPE_PARAM_FIELDS,
  type WizardParamField,
  type WizardState,
  type WizardStepId,
  type WizardStructuralElementId,
} from "@/constants/llm-wizard";
import { LlmClientError } from "@/services/llm/llm-types";
import { renderGraphmlToSvg } from "@/services/graphml/graphml-engine";
import { renderMermaidToSvg } from "@/services/mermaid/mermaid-engine";
import { renderPlantUmlPreviewSvg } from "@/utils/llm-preview";
import type { AppLocale } from "@/constants/i18n";
import {
  useLlmGate,
  type LlmGateFailureReason,
} from "@/composables/useLlmGate";
import { useLlmApiKeys } from "@/composables/useLlmApiKeys";
import { useLlmSettings } from "@/composables/useLlmSettings";

const MANUAL_LIVE_PREVIEW_STEPS = new Set<WizardStepId>([
  "direction",
  "params",
]);

function isLivePreviewStep(
  step: WizardStepId,
  aiMode: boolean,
): boolean {
  if (step === "type") {
    return true;
  }

  return !aiMode && MANUAL_LIVE_PREVIEW_STEPS.has(step);
}

export interface UseDiagramWizardFlowOptions {
  open: Ref<boolean>;
  documentKey: Ref<string>;
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
  locale: Ref<AppLocale>;
  t: TranslateFn;
  onApply: (payload: { source: string; label: string }) => void;
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
  const wizardState = ref<WizardState>({
    ...DEFAULT_WIZARD_STATE,
    typeParams: createDefaultTypeParams(),
    structuralElements: createDefaultStructuralElements(),
  });
  const isGenerating = ref(false);
  const errorMessage = ref("");
  const resultSource = ref("");
  const resultExplanation = ref("");
  const previewSvg = ref("");
  const isPreviewLoading = ref(false);
  const aiSetupVisible = ref(false);
  const aiSetupReason = ref<LlmGateFailureReason | null>(null);
  let stepPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  let previewGeneration = 0;
  const { llmConsent, llmProviderId } = useLlmSettings();
  const { hasLlmApiKey } = useLlmApiKeys();
  const planningConversation = useLlmConversation(documentKey, "wizard-plan");
  const refineConversation = useLlmConversation(documentKey, "wizard-refine");
  const isPlanningChatBusy = ref(false);
  const isRefineChatBusy = ref(false);

  const wizardSteps = computed(() => getWizardSteps(wizardState.value));
  const currentStepId = computed(() => wizardSteps.value[stepIndex.value] ?? "mode");
  const totalSteps = computed(() => wizardSteps.value.length);

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

  const showBackButton = computed(() => stepIndex.value > 0);

  const languageOptions = computed(() =>
    getWizardLanguagesForMode(wizardState.value.creationMode).map((id) => ({
      id,
      label: t(`llm.wizard.language.${id}`),
    })),
  );

  const typeOptions = computed(() =>
    getWizardTypesForLanguage(wizardState.value.language).map((id) => ({
      id,
      label: t(`llm.wizard.type.${id}`),
      description: t(`llm.wizard.typeDesc.${id}`),
    })),
  );

  const directionOptions = computed(() =>
    WIZARD_DIAGRAM_DIRECTIONS.map((id) => ({
      id,
      label: t(`llm.wizard.direction.${id}`),
    })),
  );

  const paramFields = computed((): WizardParamField[] =>
    WIZARD_TYPE_PARAM_FIELDS[wizardState.value.diagramType],
  );

  const isAiMode = computed(() => wizardState.value.creationMode === "ai");
  const selectedModeDescription = computed(() =>
    t(`llm.wizard.mode.${wizardState.value.creationMode}Desc`),
  );
  const isManualResultReady = computed(
    () =>
      !isAiMode.value &&
      currentStepId.value === "result" &&
      resultSource.value.length > 0,
  );

  const showRefineChat = computed(
    () =>
      isAiMode.value &&
      currentStepId.value === "result" &&
      resultSource.value.trim().length > 0,
  );

  const showLivePreviewPanel = computed(() => {
    const step = currentStepId.value as WizardStepId;
    if (isLivePreviewStep(step, isAiMode.value)) {
      return true;
    }

    return (
      step === "result" &&
      (previewSvg.value.length > 0 || isPreviewLoading.value)
    );
  });

  const canGoNext = computed(() => {
    if (currentStepId.value === "context") {
      return (
        wizardState.value.contextText.trim().length > 0 ||
        planningConversation.messages.value.length > 0
      );
    }

    if (currentStepId.value === "prompt") {
      return wizardState.value.promptText.trim().length > 0;
    }

    return stepIndex.value < totalSteps.value - 1;
  });

  function resetWizard(): void {
    stepIndex.value = 0;
    wizardState.value = {
      ...DEFAULT_WIZARD_STATE,
      typeParams: createDefaultTypeParams(),
      structuralElements: createDefaultStructuralElements(),
    };
    isGenerating.value = false;
    errorMessage.value = "";
    resultSource.value = "";
    resultExplanation.value = "";
    previewSvg.value = "";
    isPreviewLoading.value = false;
    previewGeneration += 1;
    aiSetupVisible.value = false;
    aiSetupReason.value = null;
    void planningConversation.clear();
    void refineConversation.clear();
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

  function syncModeForLanguage(): void {
    if (
      wizardState.value.language === "graphml" &&
      wizardState.value.creationMode === "ai"
    ) {
      wizardState.value.creationMode = "manual";
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
      syncModeForLanguage();
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

  function scheduleStepPreview(): void {
    if (stepPreviewTimer) {
      clearTimeout(stepPreviewTimer);
    }

    stepPreviewTimer = setTimeout(() => {
      void refreshStepPreview();
    }, 200);
  }

  async function refreshStepPreview(): Promise<void> {
    if (currentStepId.value === "result") {
      return;
    }

    const step = currentStepId.value as WizardStepId;
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

  watch(currentStepId, (step) => {
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

  watch(
    () => [
      wizardState.value.creationMode,
      wizardState.value.language,
      wizardState.value.diagramType,
      wizardState.value.theme,
      wizardState.value.direction,
      wizardState.value.typeParams,
      wizardState.value.structuralElements,
      wizardState.value.contextText,
      wizardState.value.typeSpecificText,
    ],
    () => {
      if (currentStepId.value === "prompt" || wizardSteps.value.includes("prompt")) {
        const promptStepIndex = wizardSteps.value.indexOf("prompt");
        if (promptStepIndex >= 0 && stepIndex.value <= promptStepIndex) {
          wizardState.value.promptText = buildWizardPrompt(wizardState.value);
        }
      }
    },
    { deep: true },
  );

  function onModeSelect(mode: string): void {
    if (mode === "ai" || mode === "manual") {
      wizardState.value.creationMode = mode;
    }
  }

  function onLanguageSelect(language: string): void {
    if (isWizardLanguage(language)) {
      wizardState.value.language = language;
    }
  }

  function onTypeSelect(diagramType: string): void {
    if (isWizardDiagramType(diagramType)) {
      wizardState.value.diagramType = diagramType;
    }
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
    if (stepIndex.value > 0 && !isGenerating.value) {
      stepIndex.value -= 1;
    }
  }

  async function loadPreview(source: string): Promise<void> {
    const generation = ++previewGeneration;
    isPreviewLoading.value = true;
    try {
      let svg = "";
      if (wizardState.value.language === "graphml") {
        svg = await renderGraphmlToSvg(source, {
          dark: diagramDarkMode.value,
          direction: wizardState.value.direction,
        });
      } else if (wizardState.value.language === "mermaid") {
        svg = await renderMermaidToSvg(
          source,
          { dark: diagramDarkMode.value },
          renderMode.value,
        );
      } else {
        svg = await renderPlantUmlPreviewSvg(
          source,
          layout.value,
          diagramDarkMode.value,
          renderMode.value,
        );
      }

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

  async function prepareManualResult(): Promise<void> {
    errorMessage.value = "";
    resultExplanation.value = "";
    resultSource.value = buildManualScaffold(wizardState.value, locale.value);
    await loadPreview(resultSource.value);
  }

  async function generateDiagram(): Promise<void> {
    isGenerating.value = true;
    errorMessage.value = "";
    resultSource.value = "";
    resultExplanation.value = "";
    previewSvg.value = "";

    if (!(await checkAiAccess())) {
      isGenerating.value = false;
      return;
    }

    try {
      const basePrompt = buildWizardPrompt(wizardState.value);
      const planningMessages = toLlmChatMessages(
        planningConversation.messages.value,
      );
      const userPrompt = buildWizardPromptWithChatContext(
        basePrompt,
        planningMessages,
      );
      wizardState.value.promptText = userPrompt;

      const result = await generateValidWizardDiagram(
        userPrompt,
        wizardState.value.language,
        wizardState.value.diagramType,
        layout.value,
        diagramDarkMode.value,
        renderMode.value,
        { silent: true },
        "Generate a complete diagram from the wizard Description and Additional requirements.",
        wizardState.value.typeParams,
        planningMessages,
      );

      resultSource.value = result.plantuml;
      resultExplanation.value = result.explanation ?? "";
      await loadPreview(result.plantuml);
    } catch (error) {
      if (error instanceof LlmClientError && error.code === "access_denied") {
        aiSetupVisible.value = true;
        const reason = error.message.replace(/^LLM access denied:\s*/, "");
        if (
          reason === "no_consent" ||
          reason === "no_key" ||
          reason === "no_proxy" ||
          reason === "provider_invalid" ||
          reason === "provider_unavailable"
        ) {
          aiSetupReason.value = reason;
        }
      }

      errorMessage.value =
        error instanceof LlmClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : t("llm.wizard.generateError");
    } finally {
      isGenerating.value = false;
    }
  }

  async function sendPlanningChatMessage(content: string): Promise<void> {
    if (!(await checkAiAccess())) {
      return;
    }

    isPlanningChatBusy.value = true;
    errorMessage.value = "";

    try {
      const priorMessages = toLlmChatMessages(planningConversation.messages.value);
      const result = await sendWizardPlanningChat(
        content,
        wizardState.value,
        priorMessages,
        { silent: true },
      );

      const assistantContent =
        result.kind === "clarification"
          ? result.clarificationQuestion
          : result.message;

      await planningConversation.appendTurn(content, assistantContent);

      if (!wizardState.value.contextText.trim()) {
        wizardState.value.contextText = content;
      }
    } catch (error) {
      errorMessage.value =
        error instanceof LlmClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : t("llm.wizard.planningChatError");
    } finally {
      isPlanningChatBusy.value = false;
    }
  }

  async function sendRefineChatMessage(content: string): Promise<void> {
    if (!resultSource.value.trim() || !(await checkAiAccess())) {
      return;
    }

    isRefineChatBusy.value = true;
    errorMessage.value = "";

    try {
      const priorMessages = toLlmChatMessages(refineConversation.messages.value);
      const refinePrompt = [
        "Refine the generated diagram below according to the user message.",
        "=== CURRENT SOURCE ===",
        resultSource.value,
        "",
        "=== USER REQUEST ===",
        content.trim(),
      ].join("\n");

      let assistantContent = "";
      let updatedSource = resultSource.value;
      let explanation: string | undefined;

      if (wizardState.value.language === "plantuml") {
        const result = await generateValidPlantUmlFullEdit(
          resultSource.value,
          content,
          layout.value,
          diagramDarkMode.value,
          renderMode.value,
          { silent: true },
          priorMessages,
        );

        if (result.needsClarification && result.clarificationQuestion) {
          assistantContent = result.clarificationQuestion;
        } else {
          updatedSource = result.plantuml;
          explanation = result.explanation;
          assistantContent =
            result.explanation?.trim() ||
            (result.hasChanges
              ? t("llm.wizard.refineApplied")
              : t("llm.wizard.refineNoChanges"));
        }
      } else {
        const result = await generateValidWizardDiagram(
          refinePrompt,
          wizardState.value.language,
          wizardState.value.diagramType,
          layout.value,
          diagramDarkMode.value,
          renderMode.value,
          { silent: true },
          "Refine the wizard-generated diagram according to the user request.",
          wizardState.value.typeParams,
          priorMessages,
        );

        updatedSource = result.plantuml;
        explanation = result.explanation;
        assistantContent =
          result.explanation?.trim() || t("llm.wizard.refineApplied");
      }

      await refineConversation.appendTurn(content, assistantContent);

      if (updatedSource !== resultSource.value) {
        resultSource.value = updatedSource;
        resultExplanation.value = explanation ?? "";
        await loadPreview(updatedSource);
      }
    } catch (error) {
      errorMessage.value =
        error instanceof LlmClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : t("llm.wizard.refineChatError");
    } finally {
      isRefineChatBusy.value = false;
    }
  }

  function goNext(): void {
    if (currentStepId.value === "context" && isAiMode.value) {
      wizardState.value.promptText = buildWizardPrompt(wizardState.value);
      stepIndex.value += 1;
      void generateDiagram();
      return;
    }

    if (currentStepId.value === "prompt") {
      wizardState.value.promptText =
        wizardState.value.promptText.trim() ||
        buildWizardPrompt(wizardState.value);
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
    languageOptions,
    typeOptions,
    directionOptions,
    paramFields,
    isAiMode,
    selectedModeDescription,
    isManualResultReady,
    canGoNext,
    onModeSelect,
    onLanguageSelect,
    onTypeSelect,
    onDirectionSelect,
    onParamChange,
    onStructuralToggle,
    goBack,
    goNext,
    handleApply,
    handleTransferToEditor,
    handleRegenerate,
    handleAiSetupRetry,
    planningMessages: planningConversation.messages,
    isPlanningChatBusy,
    sendPlanningChatMessage,
    clearPlanningChat: planningConversation.clear,
    refineMessages: refineConversation.messages,
    isRefineChatBusy,
    sendRefineChatMessage,
    clearRefineChat: refineConversation.clear,
    showRefineChat,
  };
}
