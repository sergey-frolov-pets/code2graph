<script setup lang="ts">
import LoadingState from "@/components/ui/LoadingState.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  previewSvg: string;
  isPreviewLoading: boolean;
}>();

const { t } = useLocale();
</script>

<template>
  <aside class="wizard-live-preview" :aria-label="t('llm.wizard.livePreviewTitle')">
    <p class="wizard-live-preview__title">{{ t("llm.wizard.livePreviewTitle") }}</p>
    <div class="wizard-preview" :class="{ 'is-loading': isPreviewLoading }">
      <LoadingState v-if="isPreviewLoading" compact :message="t('app.loading')" />
      <div v-else-if="previewSvg" class="wizard-preview__svg" v-html="previewSvg" />
      <p v-else class="wizard-live-preview__placeholder">
        {{ t("llm.wizard.livePreviewPlaceholder") }}
      </p>
    </div>
  </aside>
</template>

<style src="./wizard-modal.css"></style>
