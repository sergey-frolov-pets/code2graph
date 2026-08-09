<script setup lang="ts">
import type { WizardDiagramTheme, WizardState } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  wizardState: WizardState;
  themeOptions: Array<{ id: WizardDiagramTheme; label: string }>;
}>();

const emit = defineEmits<{
  "theme-select": [theme: WizardState["theme"]];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-field__label">{{ t("llm.wizard.theme") }}</p>
    <div
      class="wizard-mode-toggle"
      role="radiogroup"
      :aria-label="t('llm.wizard.theme')"
    >
      <button
        v-for="option in themeOptions"
        :key="option.id"
        class="wizard-mode-toggle__option"
        :class="{ 'is-active': wizardState.theme === option.id }"
        type="button"
        role="radio"
        :aria-checked="wizardState.theme === option.id"
        @click="emit('theme-select', option.id)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style src="../wizard-modal.css"></style>
