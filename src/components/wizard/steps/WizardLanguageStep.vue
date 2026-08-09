<script setup lang="ts">
import type { WizardState } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  wizardState: WizardState;
  isAiMode: boolean;
  languageOptions: Array<{ id: string; label: string }>;
}>();

const emit = defineEmits<{
  "language-select": [language: string];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-field__label">{{ t("llm.wizard.diagramLanguage") }}</p>
    <div
      class="wizard-radio-list"
      role="radiogroup"
      :aria-label="t('llm.wizard.diagramLanguage')"
    >
      <button
        v-for="option in languageOptions"
        :key="option.id"
        class="wizard-radio-list__option"
        :class="{ 'is-active': wizardState.language === option.id }"
        type="button"
        role="radio"
        :aria-checked="wizardState.language === option.id"
        @click="emit('language-select', option.id)"
      >
        {{ option.label }}
      </button>
    </div>
    <p v-if="isAiMode" class="wizard-hint">{{ t("llm.wizard.languageAiHint") }}</p>
    <p v-if="wizardState.language === 'graphml'" class="wizard-hint">
      {{ t("llm.wizard.languageGraphmlHint") }}
    </p>
  </div>
</template>

<style src="../wizard-modal.css"></style>
