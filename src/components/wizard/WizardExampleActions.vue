<script setup lang="ts">
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  label: string;
  canEnlarge: boolean;
}>();

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
      v-if="canEnlarge"
      type="button"
      class="wizard-example-actions__button"
      role="menuitem"
      data-testid="wizard-example-enlarge"
      @click="emit('enlarge')"
    >
      {{ t("llm.wizard.gallery.action.enlarge") }}
    </button>
  </div>
</template>

<style src="./wizard-modal.css"></style>
