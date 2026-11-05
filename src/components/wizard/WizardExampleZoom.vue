<script setup lang="ts">
import { computed } from "vue";
import AppModal from "@/components/AppModal.vue";
import WizardExampleThumb from "@/components/wizard/WizardExampleThumb.vue";
import { diagramExampleTitle } from "@/constants/diagram-example-text";
import type { DiagramExample } from "@/constants/diagram-example-catalog";
import { wizardThumbnailSvg } from "@/constants/wizard-thumbnails";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  example: DiagramExample | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t, locale } = useLocale();

const title = computed(() =>
  props.example ? diagramExampleTitle(props.example, t) : "",
);

const svg = computed(() => {
  if (!props.example) {
    return null;
  }

  return wizardThumbnailSvg(
    props.example.format,
    props.example.sampleId,
    locale.value,
  );
});

const open = computed(() => props.example !== null && svg.value !== null);
</script>

<template>
  <AppModal
    :open="open"
    viewport
    :title="title"
    test-id="wizard-example-zoom"
    @close="emit('close')"
  >
    <div
      class="wizard-example-zoom"
      :aria-label="t('llm.wizard.gallery.zoomLabel')"
    >
      <WizardExampleThumb
        v-if="svg"
        natural
        :svg="svg"
      />
    </div>
  </AppModal>
</template>

<style src="./wizard-modal.css"></style>
