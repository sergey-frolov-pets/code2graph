<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import DiagramToolbar from "@/components/DiagramToolbar.vue";
import PanelFullscreenButton from "@/components/PanelFullscreenButton.vue";
import { useLocale } from "@/composables/useLocale";
import { usePreviewPanZoom } from "@/composables/usePreviewPanZoom";
import { sanitizeSvgForPreview } from "@/utils/export";
import type { RenderMode } from "@/constants/render-settings";

const props = defineProps<{
  svg: string;
  error: string;
  isRendering: boolean;
  canExport: boolean;
  previewBackground: string;
  diagramDarkMode: boolean;
  renderMode: RenderMode;
}>();

const emit = defineEmits<{
  renderNow: [];
  exportSvg: [];
  exportPng: [];
  "update:previewBackground": [value: string];
  "update:diagramDarkMode": [value: boolean];
  "update:renderMode": [value: RenderMode];
}>();

const { t } = useLocale();
const isFullscreen = ref(false);
const viewportRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

const previewMarkup = computed(() => {
  if (!props.svg) {
    return "";
  }
  return sanitizeSvgForPreview(props.svg);
});

const {
  contentStyle,
  isDragging,
  isPinching,
  zoomIn,
  zoomOut,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
} = usePreviewPanZoom(viewportRef, contentRef, previewMarkup);

function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value;
}

function onFullscreenKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && isFullscreen.value) {
    isFullscreen.value = false;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onFullscreenKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onFullscreenKeydown);
  document.body.style.overflow = "";
});

watch(isFullscreen, (value) => {
  document.body.style.overflow = value ? "hidden" : "";
});
</script>

<template>
  <section
    class="panel preview-panel"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <header class="panel-header">
      <h2 class="panel-title" :title="t('preview.titleTooltip')">
        {{ t("preview.title") }}
      </h2>
      <div class="panel-header__toolbar">
        <DiagramToolbar
          :is-rendering="isRendering"
          :can-export="canExport"
          :preview-background="previewBackground"
          :diagram-dark-mode="diagramDarkMode"
          :render-mode="renderMode"
          @render-now="emit('renderNow')"
          @export-svg="emit('exportSvg')"
          @export-png="emit('exportPng')"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @update:preview-background="emit('update:previewBackground', $event)"
          @update:diagram-dark-mode="emit('update:diagramDarkMode', $event)"
          @update:render-mode="emit('update:renderMode', $event)"
        />
        <span v-if="isRendering" class="status-pill status-pill--compact">…</span>
      </div>
      <PanelFullscreenButton :active="isFullscreen" @toggle="toggleFullscreen" />
    </header>

    <div class="panel-body">
      <div v-if="error" class="preview-error">{{ error }}</div>
      <div v-else-if="previewMarkup" class="preview-frame">
        <div
          ref="viewportRef"
          class="preview-viewport"
          :class="{ 'is-dragging': isDragging, 'is-pinching': isPinching }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
          @pointerleave="onPointerUp"
        >
          <div
            ref="contentRef"
            class="preview-content"
            :style="contentStyle"
            v-html="previewMarkup"
          />
        </div>
      </div>
      <div v-else class="preview-placeholder">
        {{ t("preview.placeholder") }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.status-pill--compact {
  flex-shrink: 0;
  min-width: 32px;
  padding: 0 8px;
  font-size: 0.9rem;
  line-height: 32px;
}
</style>
