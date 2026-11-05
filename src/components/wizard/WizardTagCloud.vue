<script setup lang="ts">
import { exampleTagKey, type WizardCloudTag } from "@/constants/diagram-example-catalog";
import { exampleTagLabel } from "@/constants/diagram-example-text";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  tags: WizardCloudTag[];
  isSelected: (tag: WizardCloudTag) => boolean;
}>();

const emit = defineEmits<{
  toggle: [tag: WizardCloudTag];
}>();

const { t } = useLocale();
</script>

<template>
  <div
    class="wizard-tag-cloud"
    role="group"
    :aria-label="t('llm.wizard.gallery.cloudLabel')"
  >
    <button
      v-for="tag in tags"
      :key="exampleTagKey(tag)"
      type="button"
      class="wizard-tag wizard-tag--badge"
      :class="`wizard-tag--${tag.axis}`"
      :aria-pressed="isSelected(tag)"
      @click="emit('toggle', tag)"
    >
      {{ exampleTagLabel(tag, t) }}
    </button>
  </div>
</template>

<style src="./wizard-modal.css"></style>
