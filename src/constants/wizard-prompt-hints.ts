import type { AppLocale } from "@/constants/i18n";
import type { WizardDiagramType } from "@/constants/llm-wizard";
import { enMessages } from "@/locales/en";
import { ruMessages } from "@/locales/ru";
import type { LocaleKey } from "@/locales/types";

function promptHintKey(diagramType: WizardDiagramType): LocaleKey {
  return `llm.wizard.promptHint.${diagramType}` as LocaleKey;
}

export function getWizardTypePromptHint(
  diagramType: WizardDiagramType,
  locale: AppLocale,
): string {
  const messages = locale === "ru" ? ruMessages : enMessages;
  const key = promptHintKey(diagramType);
  const value = messages[key];
  return typeof value === "string" ? value : "";
}
