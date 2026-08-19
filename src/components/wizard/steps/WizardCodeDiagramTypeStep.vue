<script setup lang="ts">
import type { CodeGraphDiagramType } from "@/constants/code-graph";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  selectedDiagramType: CodeGraphDiagramType;
  options: Array<{
    id: CodeGraphDiagramType;
    label: string;
    description: string;
    allowed: boolean;
  }>;
  hybridEnabled: boolean;
  useHybridLlm: boolean;
}>();

const emit = defineEmits<{
  select: [diagramType: CodeGraphDiagramType];
  "update:useHybridLlm": [enabled: boolean];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-hint">{{ t("codeGraph.diagramTypeHint") }}</p>
    <div class="wizard-type-grid">
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        class="wizard-type-card"
        :class="{
          'is-active': selectedDiagramType === option.id,
          'is-disabled': !option.allowed,
        }"
        :disabled="!option.allowed"
        :data-testid="`code-graph-diagram-${option.id}`"
        @click="emit('select', option.id)"
      >
        <strong>{{ option.label }}</strong>
        <span>{{ option.description }}</span>
        <span v-if="!option.allowed" class="wizard-type-card__badge">
          {{ t("codeGraph.proOnly") }}
        </span>
      </button>
    </div>

    <label v-if="hybridEnabled && selectedDiagramType === 'flow'" class="code-graph-hybrid-toggle">
      <input
        type="checkbox"
        :checked="useHybridLlm"
        @change="emit('update:useHybridLlm', ($event.target as HTMLInputElement).checked)"
      />
      {{ t("codeGraph.hybridLlm") }}
    </label>
  </div>
</template>

<style src="../wizard-modal.css"></style>
<style scoped>
.code-graph-hybrid-toggle {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}
</style>
