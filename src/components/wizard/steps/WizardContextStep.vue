<script setup lang="ts">
import type { WizardState } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

const wizardState = defineModel<WizardState>("wizardState", { required: true });

defineProps<{
  isAiMode: boolean;
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <label class="wizard-field">
      <span class="wizard-field__label">
        {{ isAiMode ? t("llm.wizard.description") : t("llm.wizard.context") }}
      </span>
      <textarea
        v-model="wizardState.contextText"
        class="wizard-textarea"
        rows="6"
        :placeholder="
          isAiMode
            ? t('llm.wizard.descriptionPlaceholder')
            : t('llm.wizard.contextPlaceholder')
        "
      />
    </label>
  </div>
</template>

<style src="../wizard-modal.css"></style>
