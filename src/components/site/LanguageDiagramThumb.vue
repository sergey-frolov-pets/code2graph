<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { renderLanguageDiagramThumb } from "@/components/site/language-diagram-thumb";
import { useLocale } from "@/composables/useLocale";
import { useUiTheme } from "@/composables/useUiTheme";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { sanitizeSvgForPreview } from "@/utils/export";

const props = defineProps<{
  format: DiagramFormat;
  source: string;
  title: string;
}>();

const { t } = useLocale();
const { uiDarkMode } = useUiTheme();
const markup = ref("");
const failed = ref(false);
const loading = ref(true);

const preview = computed(() =>
  markup.value ? sanitizeSvgForPreview(markup.value) : "",
);
const caption = computed(() =>
  t("site.language.preview", { title: props.title }),
);

let requestId = 0;

watch(
  () => [props.format, props.source, uiDarkMode.value] as const,
  async ([format, source, dark]) => {
    const current = ++requestId;
    loading.value = true;
    failed.value = false;
    try {
      const svg = await renderLanguageDiagramThumb(format, source, dark);
      if (current !== requestId) {
        return;
      }
      markup.value = svg;
    } catch {
      if (current !== requestId) {
        return;
      }
      markup.value = "";
      failed.value = true;
    } finally {
      if (current === requestId) {
        loading.value = false;
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <figure
    class="language-thumb"
    :class="{ 'is-loading': loading, 'is-failed': failed }"
    :aria-label="caption"
  >
    <!-- eslint-disable vue/no-v-html, vue/max-attributes-per-line -- sanitized by sanitizeSvgForPreview -->
    <div v-if="preview" class="language-thumb__svg" v-html="preview" />
    <!-- eslint-enable vue/no-v-html, vue/max-attributes-per-line -->
    <p
      v-else-if="failed"
      class="language-thumb__status"
    >
      {{ t("site.language.previewFailed") }}
    </p>
  </figure>
</template>

<style scoped>
.language-thumb {
  --language-thumb-height: 168px;

  display: grid;
  place-items: center;
  height: var(--language-thumb-height);
  margin: 0;
  padding: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--preview-bg, var(--surface-muted));
}

.language-thumb.is-loading {
  background:
    linear-gradient(90deg, transparent, color-mix(in srgb, var(--text) 6%, transparent), transparent),
    var(--preview-bg, var(--surface-muted));
  background-size: 200% 100%;
  animation: language-thumb-wait 1.2s ease-in-out infinite;
}

.language-thumb__svg {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
}

.language-thumb__svg :deep(svg) {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: calc(var(--language-thumb-height) - 16px);
  margin: 0 auto;
}

.language-thumb__status {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
}

@keyframes language-thumb-wait {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}
</style>
