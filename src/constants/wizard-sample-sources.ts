import type { AppLocale } from "@/constants/i18n";
import {
  buildManualScaffold,
  createDefaultTypeParams,
  type WizardDiagramType,
  type WizardLanguage,
  type WizardState,
  type WizardStructuralElementId,
  WIZARD_STRUCTURAL_ELEMENT_IDS,
  WIZARD_TYPE_PARAM_FIELDS,
  WIZARD_TYPE_STRUCTURAL_ELEMENTS,
} from "@/constants/llm-wizard";

function createDemonstrationWizardState(
  diagramType: WizardDiagramType,
  language: WizardLanguage,
): WizardState {
  const typeParams = createDefaultTypeParams();

  for (const field of WIZARD_TYPE_PARAM_FIELDS[diagramType] ?? []) {
    typeParams[field.id] = Math.min(field.max, field.default + 1);
  }

  const structuralElements = Object.fromEntries(
    WIZARD_STRUCTURAL_ELEMENT_IDS.map((id) => [id, false]),
  ) as Record<WizardStructuralElementId, boolean>;

  for (const elementId of WIZARD_TYPE_STRUCTURAL_ELEMENTS[diagramType] ?? []) {
    structuralElements[elementId] = true;
  }

  return {
    creationMode: "manual",
    language,
    diagramType,
    theme: "default",
    direction: "TB",
    typeParams,
    structuralElements,
    contextText: "",
    typeSpecificText: "",
    promptText: "",
  };
}

export function buildWizardDiagramSample(
  diagramType: WizardDiagramType,
  language: WizardLanguage,
  locale: AppLocale,
): string {
  return buildManualScaffold(
    createDemonstrationWizardState(diagramType, language),
    locale,
  );
}
