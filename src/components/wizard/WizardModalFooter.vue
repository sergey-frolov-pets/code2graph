<script setup lang="ts">
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useLocale } from "@/composables/useLocale";
import type { WizardStepId } from "@/constants/llm-wizard";
import type { BuilderApplyTarget } from "@/services/diagram-builder";

const applyTarget = defineModel<BuilderApplyTarget>("applyTarget", {
  default: "new-tab",
});

defineProps<{
  currentStepId: WizardStepId | string;
  gallery: boolean;
  isBuilderMode?: boolean;
  canGoNext: boolean;
  showBackButton: boolean;
  resultSource: string;
}>();

const emit = defineEmits<{
  back: [];
  close: [];
  next: [];
  apply: [];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-footer">
    <div class="wizard-footer__start">
      <IconButton
        v-if="showBackButton"
        :label="t('llm.wizard.back')"
        extra-class="wizard-footer__btn"
        @click="emit('back')"
      >
        <ActionIcon name="back" />
      </IconButton>
    </div>

    <div class="wizard-footer__end">
      <label
        v-if="!gallery && isBuilderMode"
        class="wizard-footer__target"
      >
        <span class="sr-only">{{ t("builder.applyTarget.label") }}</span>
        <select
          v-model="applyTarget"
          class="select wizard-footer__target-select"
          :aria-label="t('builder.applyTarget.label')"
          data-testid="wizard-apply-target-select"
        >
          <option value="current">{{ t("builder.applyTarget.current") }}</option>
          <option value="new-tab">{{ t("builder.applyTarget.newTab") }}</option>
        </select>
      </label>

      <IconButton
        :label="t('app.cancel')"
        extra-class="wizard-footer__btn"
        @click="emit('close')"
      >
        <ActionIcon name="close" />
      </IconButton>

      <IconButton
        v-if="!gallery && isBuilderMode && canGoNext"
        :label="t('llm.wizard.next')"
        extra-class="wizard-footer__btn"
        @click="emit('next')"
      >
        <ActionIcon name="next" />
      </IconButton>

      <IconButton
        v-if="!gallery && isBuilderMode"
        :label="t('llm.wizard.apply')"
        extra-class="wizard-footer__btn"
        primary
        :disabled="!resultSource"
        data-testid="wizard-apply-button"
        @click="emit('apply')"
      >
        <ActionIcon name="check" />
      </IconButton>
    </div>
  </div>
</template>

<style scoped>
.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.wizard-footer__start,
.wizard-footer__end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.wizard-footer__end {
  margin-left: auto;
  justify-content: flex-end;
}

.wizard-footer__target {
  display: inline-flex;
  margin: 0;
}

.wizard-footer__target-select {
  height: 36px;
  min-height: 36px;
  padding: 0 28px 0 10px;
  font-size: 0.82rem;
}
</style>
