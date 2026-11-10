<script setup lang="ts">
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  label: string;
  llmAvailable: boolean;
  canEnlarge: boolean;
  favorite: boolean;
}>();

const emit = defineEmits<{
  choose: [action: GalleryExampleAction];
  enlarge: [];
  "toggle-favorite": [];
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
      type="button"
      class="wizard-example-actions__button"
      role="menuitemcheckbox"
      data-testid="wizard-example-favorite"
      :aria-checked="favorite"
      @click="emit('toggle-favorite')"
    >
      {{
        favorite
          ? t("llm.wizard.gallery.favorite.remove")
          : t("llm.wizard.gallery.favorite.add")
      }}
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
