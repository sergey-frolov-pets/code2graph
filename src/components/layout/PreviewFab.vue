<script setup lang="ts">
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  "show-preview": [];
}>();

const { t } = useLocale();
</script>

<template>
  <button
    v-if="visible"
    class="preview-fab"
    type="button"
    :aria-label="t('app.showPreview')"
    @click="emit('show-preview')"
  >
    <ActionIcon name="eye" />
    <span class="preview-fab__label">{{ t("app.showPreview") }}</span>
  </button>
</template>

<style scoped>
.preview-fab {
  position: fixed;
  right: 16px;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  z-index: 120;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--btn-touch);
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 92%, var(--surface));
  color: #fff;
  box-shadow: var(--shadow);
  touch-action: manipulation;
}

.preview-fab__label {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
}
</style>
