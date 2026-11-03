<script setup lang="ts">
import type { WizardDiagramDirection, WizardState } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  wizardState: WizardState;
  directionOptions: Array<{ id: WizardDiagramDirection; label: string }>;
}>();

const emit = defineEmits<{
  "direction-select": [direction: WizardState["direction"]];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-field__label">{{ t("llm.wizard.direction") }}</p>
    <div
      class="wizard-mode-toggle"
      role="radiogroup"
      :aria-label="t('llm.wizard.direction')"
    >
      <button
        v-for="option in directionOptions"
        :key="option.id"
        class="wizard-mode-toggle__option"
        :class="{ 'is-active': wizardState.direction === option.id }"
        type="button"
        role="radio"
        :aria-checked="wizardState.direction === option.id"
        @click="emit('direction-select', option.id)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style src="../wizard-modal.css"></style>
