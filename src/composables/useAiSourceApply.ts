import { ref, type Ref } from "vue";

export interface UseAiSourceApplyOptions {
  source: Ref<string>;
  error: Ref<string>;
  syntaxErrorLines: Ref<number[]>;
  persistSettings: () => void;
  scheduleRender: () => void;
  pushHistoryEntry: (entry: {
    before: string;
    after: string;
    label: string;
  }) => void;
}

export function useAiSourceApply(options: UseAiSourceApplyOptions) {
  const {
    source,
    error,
    syntaxErrorLines,
    persistSettings,
    scheduleRender,
    pushHistoryEntry,
  } = options;

  const patchSelectionStart = ref(0);
  const patchSelectionEnd = ref(0);

  function onAiPatchRequest(payload: { start: number; end: number }): void {
    patchSelectionStart.value = payload.start;
    patchSelectionEnd.value = payload.end;
  }

  function applyAiPlantUml(plantuml: string, label: string): void {
    const before = source.value;
    if (before === plantuml) {
      return;
    }

    pushHistoryEntry({ before, after: plantuml, label });
    source.value = plantuml;
    syntaxErrorLines.value = [];
    error.value = "";
    persistSettings();
    scheduleRender();
  }

  return {
    patchSelectionStart,
    patchSelectionEnd,
    onAiPatchRequest,
    applyAiPlantUml,
  };
}
