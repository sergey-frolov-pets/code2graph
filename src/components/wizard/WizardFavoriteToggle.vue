<script setup lang="ts">
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
}>();

const { t } = useLocale();
</script>

<template>
  <button
    type="button"
    class="wizard-favorite-toggle"
    :aria-pressed="active"
    :aria-label="active ? t('llm.wizard.gallery.favorite.remove') : t('llm.wizard.gallery.favorite.add')"
    @pointerdown.stop
    @click.stop="emit('toggle')"
  >
    <ActionIcon name="star" />
  </button>
</template>

<style src="./wizard-modal.css"></style>
