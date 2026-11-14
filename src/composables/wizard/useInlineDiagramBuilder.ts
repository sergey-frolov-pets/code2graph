import {
  computed,
  getCurrentScope,
  nextTick,
  onScopeDispose,
  ref,
  watch,
  type Ref,
} from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { WizardStepId } from "@/constants/llm-wizard";
import {
  detectBuilderDiagramType,
  emitSourceFromBuilderState,
  getDiagramBuilderSchema,
  hasBuilderOptionsCapabilities,
  parseSourceToBuilderState,
  supportsDiagramBuilder,
  type DiagramBuilderState,
} from "@/services/diagram-builder";

const INLINE_BUILDER_BASE_STEPS: readonly WizardStepId[] = [
  "builder-data",
  "builder-canvas",
];

export interface UseInlineDiagramBuilderOptions {
  active: Ref<boolean>;
  source: Ref<string>;
  format: Ref<DiagramFormat>;
}

export function useInlineDiagramBuilder(options: UseInlineDiagramBuilderOptions) {
  const { active, source, format } = options;

  const stepIndex = ref(0);
  const builderState = ref<DiagramBuilderState>(
    parseSourceToBuilderState("", "plantuml"),
  );
  const builderBaseSource = ref("");
  const isDirty = ref(false);
  let lastWrittenSource: string | null = null;
  let syncingFromBuilder = false;

  const steps = computed((): WizardStepId[] => {
    const schema = getDiagramBuilderSchema(
      builderState.value.format,
      builderState.value.diagramType,
    );
    if (builderState.value.diagramType === "dashboard") {
      return ["builder-data"];
    }
    if (hasBuilderOptionsCapabilities(schema.capabilities)) {
      return [...INLINE_BUILDER_BASE_STEPS, "builder-options"];
    }
    return [...INLINE_BUILDER_BASE_STEPS];
  });
  const currentStepId = computed(
    (): WizardStepId => steps.value[stepIndex.value] ?? "builder-data",
  );
  const totalSteps = computed(() => steps.value.length);
  const canGoNext = computed(() => stepIndex.value < totalSteps.value - 1);

  function loadFromSource(): void {
    if (!supportsDiagramBuilder(format.value)) {
      return;
    }

    const current = source.value;
    const detected = detectBuilderDiagramType(current, format.value);
    builderBaseSource.value = current;
    builderState.value = parseSourceToBuilderState(
      current,
      format.value,
      detected,
    );
    isDirty.value = false;
    lastWrittenSource = current;
  }

  function publishSource(force = false): void {
    if (!force && !isDirty.value) {
      return;
    }
    const emitted = emitSourceFromBuilderState(
      builderState.value,
      builderBaseSource.value,
    );
    lastWrittenSource = emitted;
    if (emitted === source.value) {
      return;
    }

    syncingFromBuilder = true;
    source.value = emitted;
    void nextTick(() => {
      syncingFromBuilder = false;
    });
  }

  function handleBuilderChange(): void {
    isDirty.value = true;
    publishSource(true);
  }

  function handleBuilderPasteSource(pastedFullSource: string): void {
    builderBaseSource.value = pastedFullSource;
    builderState.value = parseSourceToBuilderState(
      pastedFullSource,
      format.value,
      builderState.value.diagramType,
    );
    isDirty.value = true;
    publishSource(true);
  }

  function selectStep(index: number): void {
    if (index < 0 || index >= totalSteps.value) {
      return;
    }
    stepIndex.value = index;
    publishSource();
  }

  function goBack(): void {
    if (stepIndex.value > 0) {
      stepIndex.value -= 1;
      publishSource();
    }
  }

  function goNext(): void {
    if (canGoNext.value) {
      stepIndex.value += 1;
      publishSource();
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (active.value && isDirty.value) {
        publishSource(true);
      }
    });
  }

  watch(
    active,
    (isActive) => {
      if (!isActive) {
        return;
      }
      stepIndex.value = 0;
      loadFromSource();
    },
    { immediate: true },
  );

  watch([source, format], () => {
    if (!active.value || syncingFromBuilder) {
      return;
    }
    if (!supportsDiagramBuilder(format.value)) {
      return;
    }
    if (source.value === lastWrittenSource) {
      return;
    }
    loadFromSource();
  });

  return {
    stepIndex,
    steps,
    currentStepId,
    totalSteps,
    canGoNext,
    builderState,
    selectStep,
    goBack,
    goNext,
    handleBuilderChange,
    handleBuilderPasteSource,
  };
}
