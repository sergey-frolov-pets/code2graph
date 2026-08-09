<script setup lang="ts">
import type { WizardState } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  wizardState: WizardState;
  typeOptions: Array<{ id: string; label: string; description: string }>;
}>();

const emit = defineEmits<{
  "type-select": [diagramType: string];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-field__label">{{ t("llm.wizard.diagramType") }}</p>
    <div
      class="wizard-radio-list wizard-radio-list--grid"
      role="radiogroup"
      :aria-label="t('llm.wizard.diagramType')"
    >
      <button
        v-for="option in typeOptions"
        :key="option.id"
        class="wizard-radio-list__option wizard-radio-list__option--stacked"
        :class="{ 'is-active': wizardState.diagramType === option.id }"
        type="button"
        role="radio"
        :aria-checked="wizardState.diagramType === option.id"
        @click="emit('type-select', option.id)"
      >
        <span class="wizard-radio-list__label">{{ option.label }}</span>
        <span class="wizard-radio-list__desc">{{ option.description }}</span>
      </button>
    </div>
  </div>
</template>

<style src="../wizard-modal.css"></style>
