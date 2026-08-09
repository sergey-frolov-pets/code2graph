<script setup lang="ts">
import type {
  WizardParamField,
  WizardState,
  WizardStructuralElementId,
} from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

const wizardState = defineModel<WizardState>("wizardState", { required: true });

defineProps<{
  isAiMode: boolean;
  paramFields: WizardParamField[];
  structuralElementOptions: Array<{ id: WizardStructuralElementId; label: string }>;
}>();

const emit = defineEmits<{
  "param-change": [paramId: WizardParamField["id"], event: Event];
  "structural-toggle": [elementId: WizardStructuralElementId, event: Event];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-hint">{{ t("llm.wizard.paramsHint") }}</p>
    <label
      v-for="field in paramFields"
      :key="field.id"
      class="wizard-field wizard-field--inline"
    >
      <span class="wizard-field__label">{{ t(`llm.wizard.param.${field.id}`) }}</span>
      <input
        class="wizard-input"
        type="number"
        :min="field.min"
        :max="field.max"
        :value="wizardState.typeParams[field.id]"
        @change="emit('param-change', field.id, $event)"
      />
      <span class="wizard-field__hint">
        {{ t("llm.wizard.paramRange", { min: field.min, max: field.max }) }}
      </span>
    </label>

    <div v-if="structuralElementOptions.length > 0" class="wizard-structural">
      <p class="wizard-field__label">{{ t("llm.wizard.structuralElements") }}</p>
      <div class="wizard-structural__grid">
        <label
          v-for="option in structuralElementOptions"
          :key="option.id"
          class="wizard-structural__item"
        >
          <input
            type="checkbox"
            :checked="wizardState.structuralElements[option.id]"
            @change="emit('structural-toggle', option.id, $event)"
          />
          <span>{{ option.label }}</span>
        </label>
      </div>
    </div>

    <label v-if="!isAiMode" class="wizard-field">
      <span class="wizard-field__label">{{ t("llm.wizard.details") }}</span>
      <textarea
        v-model="wizardState.typeSpecificText"
        class="wizard-textarea"
        rows="3"
        :placeholder="t(`llm.wizard.detailsPlaceholder.${wizardState.diagramType}`)"
      />
    </label>
  </div>
</template>

<style src="../wizard-modal.css"></style>
