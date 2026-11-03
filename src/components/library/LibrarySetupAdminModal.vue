<script setup lang="ts">
import AppModal from "@/components/AppModal.vue";
import LibrarySetupAdminPanel from "@/components/library/LibrarySetupAdminPanel.vue";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  open: boolean;
  apiUrl?: string;
}>();

const emit = defineEmits<{
  completed: [];
  close: [];
}>();

const { t } = useLocale();

function onCompleted(): void {
  emit("completed");
}

function onClose(): void {
  emit("close");
}
</script>

<template>
  <AppModal
    :open="props.open"
    :title="t('library.setupAdminTitle')"
    variant="default"
    wide
    layer="above-library"
    @close="onClose()"
  >
    <LibrarySetupAdminPanel :api-url="apiUrl" @completed="onCompleted()" />
    <div class="modal-actions">
      <button class="btn" type="button" @click="onClose()">
        {{ t("app.close") }}
      </button>
    </div>
  </AppModal>
</template>
