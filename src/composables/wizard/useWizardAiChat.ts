import { computed, ref, type Ref } from "vue";
import { useLlmConversation } from "@/composables/useLlmConversation";
import type { LlmGateFailureReason } from "@/composables/useLlmGate";
import type { LayoutEngine } from "@/constants";
import type { AppLocale } from "@/constants/i18n";
import type { WizardState, WizardStepId } from "@/constants/llm-wizard";
import type { RenderMode } from "@/constants/render-settings";
import type { TranslateFn } from "@/locales/types";
import { generateValidWizardDiagram } from "@/services/llm/llm-plantuml-generate";
import { LlmClientError } from "@/services/llm/llm-types";
import {
  buildWizardPromptWithChatContext,
  sendWizardPlanningChat,
} from "@/services/llm/llm-wizard-chat";
import { buildWizardPrompt } from "@/services/llm/wizard/wizard-prompts";
import { toLlmChatMessages } from "@/utils/llm-edit-conversation";

const ACCESS_DENIED_REASONS = new Set<LlmGateFailureReason>([
  "no_consent",
  "no_key",
  "no_proxy",
  "provider_invalid",
  "provider_unavailable",
]);

function parseAccessDeniedReason(message: string): LlmGateFailureReason | null {
  const reason = message.replace(/^LLM access denied:\s*/, "") as LlmGateFailureReason;
  return ACCESS_DENIED_REASONS.has(reason) ? reason : null;
}

export interface UseWizardAiChatOptions {
  documentKey: Ref<string>;
  wizardState: Ref<WizardState>;
  currentStepId: Ref<WizardStepId>;
  isAiMode: Ref<boolean>;
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
  locale: Ref<AppLocale>;
  isGenerating: Ref<boolean>;
  errorMessage: Ref<string>;
  resultSource: Ref<string>;
  resultExplanation: Ref<string>;
  previewSvg: Ref<string>;
  aiSetupVisible: Ref<boolean>;
  aiSetupReason: Ref<LlmGateFailureReason | null>;
  checkAiAccess: () => Promise<boolean>;
  loadPreview: (source: string) => Promise<void>;
  t: TranslateFn;
}

export function useWizardAiChat(options: UseWizardAiChatOptions) {
  const {
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
  } = options;

  const planningConversation = useLlmConversation(documentKey, "wizard-plan");
  const refineConversation = useLlmConversation(documentKey, "wizard-refine");
  const isPlanningChatBusy = ref(false);
  const isRefineChatBusy = ref(false);

  const showRefineChat = computed(
    () =>
      isAiMode.value &&
      currentStepId.value === "result" &&
      resultSource.value.trim().length > 0,
  );

  function clearConversations(): void {
    void planningConversation.clear();
    void refineConversation.clear();
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
      const basePrompt = buildWizardPrompt(wizardState.value, locale.value);
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
        {
          description: wizardState.value.contextText,
          additionalRequirements: wizardState.value.typeSpecificText,
        },
      );

      resultSource.value = result.plantuml;
      resultExplanation.value = result.explanation ?? "";
      await loadPreview(result.plantuml);
    } catch (error) {
      if (error instanceof LlmClientError && error.code === "access_denied") {
        aiSetupVisible.value = true;
        const parsedReason = parseAccessDeniedReason(error.message);
        if (parsedReason) {
          aiSetupReason.value = parsedReason;
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
        locale.value,
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

      const refineFormatContext = {
        description: wizardState.value.contextText,
        additionalRequirements: content.trim(),
      };

      const result = await generateValidWizardDiagram(
        refinePrompt,
        wizardState.value.language,
        wizardState.value.diagramType,
        layout.value,
        diagramDarkMode.value,
        renderMode.value,
        { silent: true },
        "Refine the wizard-generated diagram according to the user request. Expand incomplete branches when the user asks for missing items.",
        wizardState.value.typeParams,
        priorMessages,
        refineFormatContext,
      );

      const updatedSource = result.plantuml;
      const explanation = result.explanation;
      const assistantContent =
        result.explanation?.trim() || t("llm.wizard.refineApplied");

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

  return {
    planningMessages: planningConversation.messages,
    isPlanningChatBusy,
    sendPlanningChatMessage,
    clearPlanningChat: planningConversation.clear,
    refineMessages: refineConversation.messages,
    isRefineChatBusy,
    sendRefineChatMessage,
    clearRefineChat: refineConversation.clear,
    showRefineChat,
    clearConversations,
    generateDiagram,
  };
}
