<script setup lang="ts">
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  open: boolean;
  title: string;
  previewMarkup: string;
  isRendering: boolean;
  error: string;
  watermarked: boolean;
  watermarkLabel: string;
  canDownload?: boolean;
  downloadsRemaining?: number | null;
  isDownloading?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  download: [];
}>();

const { t } = useLocale();
</script>

<template>
  <AppModal :open="open" :title="title" @close="emit('close')">
    <p v-if="error" class="library-preview-modal__error">{{ error }}</p>
    <p v-else-if="isRendering" class="library-preview-modal__hint">
      {{ t("library.previewLoading") }}
    </p>

    <div v-else-if="previewMarkup" class="library-preview-modal__viewport">
      <div class="library-preview-modal__content" v-html="previewMarkup" />
      <div
        v-if="watermarked"
        class="library-preview-modal__watermark"
        :aria-hidden="true"
      >
        <span
          v-for="index in 12"
          :key="index"
          class="library-preview-modal__watermark-line"
        >
          {{ watermarkLabel }}
        </span>
      </div>
    </div>

    <p v-if="watermarked" class="library-preview-modal__hint">
      {{ t("library.previewWatermarkHint") }}
    </p>

    <p
      v-if="canDownload && downloadsRemaining !== null"
      class="library-preview-modal__hint"
    >
      {{ t("library.downloadsRemaining", { count: downloadsRemaining ?? 0 }) }}
    </p>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.close") }}
      </button>
      <button
        v-if="canDownload"
        class="btn btn-primary"
        type="button"
        :disabled="isDownloading || downloadsRemaining === 0"
        @click="emit('download')"
      >
        {{
          isDownloading
            ? t("app.loading")
            : t("library.downloadOriginal")
        }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.library-preview-modal__viewport {
  position: relative;
  min-height: 240px;
  max-height: 60vh;
  overflow: auto;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  background: var(--preview-bg, #fff);
}

.library-preview-modal__content {
  padding: 12px;
}

.library-preview-modal__content :deep(svg) {
  max-width: 100%;
  height: auto;
}

.library-preview-modal__watermark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  padding: 16px;
  overflow: hidden;
}

.library-preview-modal__watermark-line {
  transform: rotate(-24deg);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(80, 80, 80, 0.18);
  white-space: nowrap;
}

.library-preview-modal__error {
  color: var(--danger, #c62828);
}

.library-preview-modal__hint {
  margin: 8px 0 0;
  font-size: 0.88rem;
  color: var(--text-muted, #666);
}
</style>
