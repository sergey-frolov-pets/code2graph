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
}>();

const emit = defineEmits<{
  select: [diagramType: CodeGraphDiagramType];
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
        @click="emit('select', option.id)"
      >
        <strong>{{ option.label }}</strong>
        <span>{{ option.description }}</span>
        <span v-if="!option.allowed" class="wizard-type-card__badge">
          {{ t("codeGraph.proOnly") }}
        </span>
      </button>
    </div>
  </div>
</template>

<style src="../wizard-modal.css"></style>
