import type { AppLocale } from "@/constants/i18n";
import type { WizardDiagramType } from "@/constants/llm-wizard";
import { messagesByLocale } from "@/locales/messages";
import type { LocaleKey } from "@/locales/types";

function promptHintKey(diagramType: WizardDiagramType): LocaleKey {
  return `llm.wizard.promptHint.${diagramType}` as LocaleKey;
}

export function getWizardTypePromptHint(
  diagramType: WizardDiagramType,
  locale: AppLocale,
): string {
  const key = promptHintKey(diagramType);
  const value = messagesByLocale[locale][key];
  return typeof value === "string" ? value : "";
}
