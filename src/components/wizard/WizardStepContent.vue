<script setup lang="ts">
import BuilderCanvasAxesStep from "@/components/wizard/steps/BuilderCanvasAxesStep.vue";
import BuilderDataTableStep from "@/components/wizard/steps/BuilderDataTableStep.vue";
import BuilderOptionsStep from "@/components/wizard/steps/BuilderOptionsStep.vue";
import { useLocale } from "@/composables/useLocale";
import type { WizardStepId } from "@/constants/llm-wizard";
import type { DiagramBuilderState } from "@/services/diagram-builder";
import type { TablePasteErrorInfo } from "@/services/table-paste/types";

const builderState = defineModel<DiagramBuilderState>("builderState");

defineProps<{
  currentStepId: WizardStepId | string;
  resultSource?: string;
}>();

const emit = defineEmits<{
  "builder-change": [];
  "builder-paste-source": [source: string];
  "builder-paste-error": [error: TablePasteErrorInfo];
  "open-dashboard": [];
}>();

const { t } = useLocale();
</script>

<template>
  <div
    v-if="currentStepId === 'builder-data' && builderState?.diagramType === 'dashboard'"
    class="builder-step"
  >
    <button
      class="btn"
      type="button"
      @click="emit('open-dashboard')"
    >
      {{ t("library.dashboard.create") }}
    </button>
  </div>

  <BuilderDataTableStep
    v-else-if="currentStepId === 'builder-data' && builderState"
    v-model:builder-state="builderState"
    :current-source="resultSource ?? ''"
    @change="emit('builder-change')"
    @paste-applied-source="emit('builder-paste-source', $event)"
    @paste-error="emit('builder-paste-error', $event)"
  />

  <BuilderCanvasAxesStep
    v-else-if="currentStepId === 'builder-canvas' && builderState"
    v-model:builder-state="builderState"
    @change="emit('builder-change')"
  />

  <BuilderOptionsStep
    v-else-if="currentStepId === 'builder-options' && builderState"
    v-model:builder-state="builderState"
    @change="emit('builder-change')"
  />
</template>
