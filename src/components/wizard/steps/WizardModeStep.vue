<script setup lang="ts">
import { WIZARD_CREATION_MODES } from "@/constants/llm-wizard";
import type { WizardState } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  wizardState: WizardState;
  selectedModeDescription: string;
}>();

const emit = defineEmits<{
  "mode-select": [mode: string];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-hint">{{ t("llm.wizard.modeHint") }}</p>
    <div
      class="wizard-mode-toggle"
      role="radiogroup"
      :aria-label="t('llm.wizard.step.mode')"
    >
      <button
        v-for="mode in WIZARD_CREATION_MODES"
        :key="mode"
        class="wizard-mode-toggle__option"
        :class="{ 'is-active': wizardState.creationMode === mode }"
        type="button"
        role="radio"
        :aria-checked="wizardState.creationMode === mode"
        @click="emit('mode-select', mode)"
      >
        {{ t(`llm.wizard.mode.${mode}`) }}
      </button>
    </div>
    <p class="wizard-mode-toggle__desc">{{ selectedModeDescription }}</p>
  </div>
</template>

<style src="../wizard-modal.css"></style>
