<script setup lang="ts">
import { ref } from "vue";
import LoadingState from "@/components/ui/LoadingState.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  previewSvg: string;
  isPreviewLoading: boolean;
  sourceCode?: string;
}>();

const { t } = useLocale();
const activeTab = ref<"visual" | "code">("visual");
</script>

<template>
  <aside class="wizard-live-preview" :aria-label="t('llm.wizard.livePreviewTitle')">
    <div class="wizard-live-preview__header">
      <p class="wizard-live-preview__title">{{ t("llm.wizard.livePreviewTitle") }}</p>
      <div
        v-if="sourceCode !== undefined"
        class="builder-subtabs builder-subtabs--compact"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          class="builder-subtabs__tab"
          :class="{ 'is-active': activeTab === 'visual' }"
          :aria-selected="activeTab === 'visual'"
          @click="activeTab = 'visual'"
        >
          {{ t("builder.previewTab.visual") }}
        </button>
        <button
          type="button"
          role="tab"
          class="builder-subtabs__tab"
          :class="{ 'is-active': activeTab === 'code' }"
          :aria-selected="activeTab === 'code'"
          data-testid="wizard-preview-code-tab"
          @click="activeTab = 'code'"
        >
          {{ t("builder.previewTab.code") }}
        </button>
      </div>
    </div>
    <div
      v-if="activeTab === 'code' && sourceCode !== undefined"
      class="wizard-preview wizard-preview--code"
      data-testid="wizard-preview-code-box"
    >
      <pre class="wizard-preview__pre"><code>{{ sourceCode }}</code></pre>
    </div>
    <div v-else class="wizard-preview" :class="{ 'is-loading': isPreviewLoading }">
      <LoadingState v-if="isPreviewLoading" compact :message="t('app.loading')" />
      <div v-else-if="previewSvg" class="wizard-preview__svg" v-html="previewSvg" />
      <p v-else class="wizard-live-preview__placeholder">
        {{ t("llm.wizard.livePreviewPlaceholder") }}
      </p>
    </div>
  </aside>
</template>

<style src="./wizard-modal.css"></style>
