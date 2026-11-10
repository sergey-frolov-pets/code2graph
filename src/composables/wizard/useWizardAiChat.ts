import type { Ref } from "vue";
import type { LlmGateFailureReason } from "@/composables/useLlmGate";
import type { LayoutEngine } from "@/constants";
import type { AppLocale } from "@/constants/i18n";
import type { WizardState, WizardStepId } from "@/constants/llm-wizard";
import type { RenderMode } from "@/constants/render-settings";
import type { TranslateFn } from "@/locales/types";
import { generateValidWizardDiagram } from "@/services/llm/llm-plantuml-generate";
import { LlmClientError } from "@/services/llm/llm-types";
import { buildWizardPrompt } from "@/services/llm/wizard/wizard-prompts";

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

/**
 * Мастер создаёт диаграмму одним запросом по заполненным шагам.
 * Диалоговое общение с ИИ живёт только в режиме «ИИ-чат» редактора —
 * планирующих и уточняющих чатов у мастера больше нет.
 */
export function useWizardAiChat(options: UseWizardAiChatOptions) {
  const {
    wizardState,
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
      const userPrompt = buildWizardPrompt(wizardState.value, locale.value);
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
        [],
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

  return { generateDiagram };
}
