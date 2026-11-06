<script setup lang="ts">
import { computed, ref } from "vue";
import { exampleTagKey, type WizardCloudTag } from "@/constants/diagram-example-catalog";
import { exampleTagLabel } from "@/constants/diagram-example-text";
import { useLocale } from "@/composables/useLocale";

const props = withDefaults(
  defineProps<{
    tags: WizardCloudTag[];
    isSelected: (tag: WizardCloudTag) => boolean;
    initiallyExpanded?: boolean;
  }>(),
  {
    initiallyExpanded: false,
  },
);

const emit = defineEmits<{
  toggle: [tag: WizardCloudTag];
}>();

const { t } = useLocale();

const isExpanded = ref(props.initiallyExpanded);

const selectedTags = computed(() =>
  props.tags.filter((tag) => props.isSelected(tag)),
);

const visibleTags = computed(() =>
  isExpanded.value ? props.tags : selectedTags.value,
);
</script>

<template>
  <div
    class="wizard-tag-section"
    :class="{ 'is-expanded': isExpanded, 'is-collapsed': !isExpanded }"
    data-testid="wizard-tag-section"
  >
    <div class="wizard-tag-section__bar">
      <button
        type="button"
        class="wizard-tag-section__toggle"
        :aria-expanded="isExpanded"
        data-testid="wizard-tag-cloud-toggle"
        @click="isExpanded = !isExpanded"
      >
        <span class="wizard-tag-section__chevron" aria-hidden="true">
          {{ isExpanded ? "▾" : "▸" }}
        </span>
        <span>
          {{
            isExpanded
              ? t("llm.wizard.gallery.collapseTags")
              : t("llm.wizard.gallery.expandTags", { count: tags.length })
          }}
        </span>
      </button>

      <div
        v-if="!isExpanded && visibleTags.length > 0"
        class="wizard-tag-cloud wizard-tag-cloud--collapsed"
        role="group"
        :aria-label="t('llm.wizard.gallery.cloudLabel')"
      >
        <button
          v-for="tag in visibleTags"
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
    </div>

    <div
      v-if="isExpanded"
      class="wizard-tag-cloud"
      role="group"
      :aria-label="t('llm.wizard.gallery.cloudLabel')"
    >
      <button
        v-for="tag in visibleTags"
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
  </div>
</template>

<style src="./wizard-modal.css"></style>
