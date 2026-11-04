<script setup lang="ts">
import { GALLERY_EXAMPLE_ACTIONS, type GalleryExampleAction } from "@/constants/wizard-gallery";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  label: string;
}>();

const emit = defineEmits<{
  choose: [action: GalleryExampleAction];
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
      v-for="action in GALLERY_EXAMPLE_ACTIONS"
      :key="action"
      type="button"
      class="wizard-example-actions__button"
      role="menuitem"
      @click="emit('choose', action)"
    >
      {{ t(`llm.wizard.gallery.action.${action}`) }}
    </button>
  </div>
</template>

<style src="./wizard-modal.css"></style>
