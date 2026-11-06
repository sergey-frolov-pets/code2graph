import { ref, type Ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { useEditorFoldOnboarding } from "@/composables/wizard/useWizardOnboarding";

export interface UseAiSourceApplyOptions {
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  error: Ref<string>;
  syntaxErrorLines: Ref<number[]>;
  persistSettings: () => void;
  scheduleRender: () => void;
  pushHistoryEntry: (entry: {
    before: string;
    after: string;
    label: string;
    beforeFormat?: DiagramFormat;
    afterFormat?: DiagramFormat;
  }) => void;
}

export function useAiSourceApply(options: UseAiSourceApplyOptions) {
  const {
    source,
    diagramFormat,
    error,
    syntaxErrorLines,
    persistSettings,
    scheduleRender,
    pushHistoryEntry,
  } = options;

  const patchSelectionStart = ref(0);
  const patchSelectionEnd = ref(0);
  const { maybeShowAfterWizardApply } = useEditorFoldOnboarding();

  function onAiPatchRequest(payload: { start: number; end: number }): void {
    patchSelectionStart.value = payload.start;
    patchSelectionEnd.value = payload.end;
  }

  function applyAiPlantUml(
    plantuml: string,
    label: string,
    nextFormat?: DiagramFormat,
  ): void {
    const before = source.value;
    const beforeFormat = diagramFormat.value;
    const afterFormat = nextFormat ?? beforeFormat;
    if (before === plantuml && beforeFormat === afterFormat) {
      return;
    }

    pushHistoryEntry({
      before,
      after: plantuml,
      label,
      ...(beforeFormat === afterFormat
        ? {}
        : { beforeFormat, afterFormat }),
    });
    source.value = plantuml;
    if (afterFormat !== beforeFormat) {
      diagramFormat.value = afterFormat;
    }
    syntaxErrorLines.value = [];
    error.value = "";
    persistSettings();
    scheduleRender();
  }

  function applyWizardDiagram(
    nextSource: string,
    label: string,
    nextFormat?: DiagramFormat,
  ): void {
    applyAiPlantUml(nextSource, label, nextFormat);
    maybeShowAfterWizardApply();
  }

  return {
    patchSelectionStart,
    patchSelectionEnd,
    onAiPatchRequest,
    applyAiPlantUml,
    applyWizardDiagram,
    onWizardDiagramApplied: maybeShowAfterWizardApply,
  };
}
