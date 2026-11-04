<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { exampleTagKey, type WizardCloudTag } from "@/constants/diagram-example-catalog";
import { exampleTagLabel } from "@/constants/diagram-example-text";
import { WIZARD_TAG_CLOUD_FALLBACK_WIDTH_PX } from "@/constants/wizard-gallery";
import { layoutWizardTagCloud } from "@/constants/wizard-tag-cloud-layout";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  tags: WizardCloudTag[];
  isSelected: (tag: WizardCloudTag) => boolean;
}>();

const emit = defineEmits<{
  toggle: [tag: WizardCloudTag];
}>();

const { t } = useLocale();
const root = ref<HTMLElement | null>(null);
const widthPx = ref(WIZARD_TAG_CLOUD_FALLBACK_WIDTH_PX);
let resizeObserver: ResizeObserver | null = null;

const layout = computed(() =>
  layoutWizardTagCloud(
    props.tags.map((tag) => ({
      key: exampleTagKey(tag),
      fontSizePx: tag.fontSizePx,
      textLength: exampleTagLabel(tag, t).length,
    })),
    widthPx.value,
  ),
);

const placementByKey = computed(() => {
  const placed = new Map(layout.value.placements.map((item) => [item.key, item]));
  return placed;
});

function placementFor(tag: WizardCloudTag) {
  return placementByKey.value.get(exampleTagKey(tag));
}

onMounted(() => {
  const element = root.value;
  if (!element || typeof ResizeObserver === "undefined") {
    return;
  }

  resizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0;
    if (width > 0) {
      widthPx.value = width;
    }
  });
  resizeObserver.observe(element);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <div
    ref="root"
    class="wizard-tag-cloud"
    role="group"
    :aria-label="t('llm.wizard.gallery.cloudLabel')"
    :style="{ height: `${layout.heightPx}px` }"
  >
    <button
      v-for="tag in tags"
      :key="exampleTagKey(tag)"
      type="button"
      class="wizard-tag"
      :class="`wizard-tag--${tag.axis}`"
      :style="{
        fontSize: `${tag.fontSizePx}px`,
        left: `${placementFor(tag)?.leftPx ?? 0}px`,
        top: `${placementFor(tag)?.topPx ?? 0}px`,
      }"
      :aria-pressed="isSelected(tag)"
      @click="emit('toggle', tag)"
    >
      {{ exampleTagLabel(tag, t) }}
    </button>
  </div>
</template>

<style src="./wizard-modal.css"></style>
