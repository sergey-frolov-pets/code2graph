<script setup lang="ts">
import AppModal from "@/components/AppModal.vue";
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  readClipboard: [];
}>();

const { t } = useLocale();
</script>

<template>
  <AppModal
    :open="open"
    :title="t('app.clipboardDiagramTitle')"
    test-id="clipboard-diagram-prompt"
    @close="emit('close')"
  >
    <p class="clipboard-diagram-prompt__hint">
      {{ t("app.clipboardDiagramHint") }}
    </p>
    <IconButton
      :label="t('app.clipboardDiagramRead')"
      primary
      data-testid="clipboard-diagram-read"
      @click="emit('readClipboard')"
    >
      <ActionIcon name="clipboard-copy" />
    </IconButton>
  </AppModal>
</template>

<style scoped>
.clipboard-diagram-prompt__hint {
  margin: 0 0 12px;
}
</style>
