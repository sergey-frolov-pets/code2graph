<script setup lang="ts">
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import { useLocale } from "@/composables/useLocale";

withDefaults(
  defineProps<{
    label: string;
    llmAvailable: boolean;
    canEnlarge: boolean;
    canBuilder?: boolean;
  }>(),
  {
    canBuilder: true,
  },
);

const emit = defineEmits<{
  choose: [action: GalleryExampleAction];
  enlarge: [];
}>();

const { t } = useLocale();
</script>

<template>
  <div
    class="wizard-example-actions"
    role="menu"
    :aria-label="label"
  >
    <button
      type="button"
      class="wizard-example-actions__button"
      role="menuitem"
      @click="emit('choose', 'editor')"
    >
      {{ t("llm.wizard.gallery.action.editor") }}
    </button>
    <button
      v-if="canBuilder"
      type="button"
      class="wizard-example-actions__button"
      role="menuitem"
      data-testid="wizard-example-builder"
      @click="emit('choose', 'builder')"
    >
      {{ t("llm.wizard.gallery.action.builder") }}
    </button>
    <button
      v-if="canEnlarge"
      type="button"
      class="wizard-example-actions__button"
      role="menuitem"
      data-testid="wizard-example-enlarge"
      @click="emit('enlarge')"
    >
      {{ t("llm.wizard.gallery.action.enlarge") }}
    </button>
    <button
      v-if="llmAvailable"
      type="button"
      class="wizard-example-actions__button"
      role="menuitem"
      data-testid="wizard-example-llm"
      @click="emit('choose', 'llm')"
    >
      {{ t("llm.wizard.gallery.action.llm") }}
    </button>
  </div>
</template>

<style src="./wizard-modal.css"></style>
