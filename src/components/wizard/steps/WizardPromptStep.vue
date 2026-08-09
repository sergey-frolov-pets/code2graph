<script setup lang="ts">
import type { WizardState } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

const wizardState = defineModel<WizardState>("wizardState", { required: true });

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <label class="wizard-field">
      <span class="wizard-field__label">{{ t("llm.wizard.prompt") }}</span>
      <textarea
        v-model="wizardState.promptText"
        class="wizard-textarea"
        rows="10"
      />
    </label>
  </div>
</template>

<style src="../wizard-modal.css"></style>
