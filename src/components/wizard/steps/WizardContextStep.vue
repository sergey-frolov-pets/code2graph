<script setup lang="ts">
import type { WizardState } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

const wizardState = defineModel<WizardState>("wizardState", { required: true });

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <label class="wizard-field">
      <span class="wizard-field__label">{{ t("llm.wizard.description") }}</span>
      <p class="wizard-type-hint">
        <span class="wizard-type-hint__label">{{ t("llm.wizard.promptHintLabel") }}</span>
        {{ t(`llm.wizard.promptHint.${wizardState.diagramType}`) }}
      </p>
      <textarea
        v-model="wizardState.contextText"
        class="wizard-textarea"
        rows="3"
        :placeholder="t(`llm.wizard.promptHint.${wizardState.diagramType}`)"
      />
    </label>
    <p class="wizard-chat-lead">{{ t("llm.wizard.contextChatMovedHint") }}</p>
  </div>
</template>

<style src="../wizard-modal.css"></style>
<style scoped>
.wizard-chat-lead {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.wizard-type-hint {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--surface-muted, rgba(0, 0, 0, 0.04));
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.wizard-type-hint__label {
  display: block;
  margin-bottom: 4px;
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 600;
}
</style>
