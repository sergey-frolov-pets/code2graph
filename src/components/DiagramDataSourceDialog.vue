<script setup lang="ts">
import AppModal from "@/components/AppModal.vue";
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  open: boolean;
  filePathLabel: string;
  sheetRange: string;
  clipboardReady: boolean;
  busy: boolean;
  errorMessage: string;
}>();

const emit = defineEmits<{
  close: [];
  useClipboard: [];
  useFile: [];
}>();

const { t } = useLocale();
</script>

<template>
  <AppModal
    :open="open"
    :title="t('library.dataLink.chooserTitle')"
    test-id="diagram-data-source-dialog"
    @close="emit('close')"
  >
    <p class="data-source-dialog__hint">
      {{
        t("library.dataLink.chooserHint", {
          path: filePathLabel || t("library.dataLink.pathMissing"),
          range: sheetRange,
        })
      }}
    </p>
    <p v-if="errorMessage" class="data-source-dialog__error" role="alert">
      {{ errorMessage }}
    </p>
    <div class="data-source-dialog__actions">
      <IconButton
        v-if="clipboardReady"
        :label="t('library.dataLink.clipboardOption')"
        primary
        :disabled="busy"
        data-testid="diagram-data-clipboard"
        @click="emit('useClipboard')"
      >
        <ActionIcon name="clipboard-copy" />
      </IconButton>
      <IconButton
        :label="busy ? t('app.loading') : t('library.dataLink.fileOption')"
        :primary="!clipboardReady"
        :disabled="busy"
        data-testid="diagram-data-file"
        @click="emit('useFile')"
      >
        <ActionIcon name="folder-open" />
      </IconButton>
    </div>
  </AppModal>
</template>

<style scoped>
.data-source-dialog__hint {
  margin: 0 0 12px;
}

.data-source-dialog__error {
  margin: 0 0 12px;
  color: var(--danger, var(--text));
}

.data-source-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
