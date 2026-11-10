<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, toRef, watch } from "vue";
import AppearanceModal from "@/components/AppearanceModal.vue";
import DiagramToolbar from "@/components/DiagramToolbar.vue";
import PresentationPanel from "@/components/preview/PresentationPanel.vue";
import PresentationStage from "@/components/preview/PresentationStage.vue";
import { presentationSessionKey } from "@/components/preview/presentation-session";
import LoadingState from "@/components/ui/LoadingState.vue";
import PanelDualScreenButton from "@/components/PanelDualScreenButton.vue";
import PanelFullscreenButton from "@/components/PanelFullscreenButton.vue";
import { useLocale } from "@/composables/useLocale";
import { useImageSize } from "@/composables/useImageSize";
import { usePresentationSession } from "@/composables/usePresentationSession";
import { usePreviewPanZoom } from "@/composables/usePreviewPanZoom";
import { isTransparentPreviewBg } from "@/constants/editor-settings";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
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
  /** Цвет текста диаграммы (`textcolor`); пусто — автоподбор под фон. */
  textColor: string;
  /** Семейство шрифта диаграммы (`fontfamily`). */
  diagramFontFamily: string;
  diagramFontWeight: string;
  diagramFontStyle: string;
  copyPng: () => Promise<boolean>;
  /** Increments when a data link should expand the preview. */
  expandSignal?: number;
  /** Кнопка «превью в другой вкладке». На узкой раскладке редактора её нет. */
  showDualScreen?: boolean;
  dualScreenActive?: boolean;
  /** Заменяет холст, когда вкладка кода больше не на связи. */
  blockedMessage?: string;
  /** Исходник диаграммы. Без него панель презентации скрыта. */
  source?: string;
  diagramFormat?: DiagramFormat;
  /** Правка трека доступна только редактору, который может записать исходник. */
  canEditPresentation?: boolean;
}>();

const emit = defineEmits<{
  renderNow: [];
  exportSvg: [];
  exportPng: [];
  "update:previewBackground": [value: string];
  "update:diagramDarkMode": [value: boolean];
  "update:textColor": [value: string];
  "update:diagramFontFamily": [value: string];
  "update:diagramFontWeight": [value: string];
  "update:diagramFontStyle": [value: string];
  "update:renderMode": [value: RenderMode];
  "update:imageSize": [value: { width: number; height: number } | null];
  toggleDualScreen: [];
  "update:source": [value: string];
}>();

const { t } = useLocale();
const transparentPreview = computed(() => isTransparentPreviewBg(props.previewBackground));
const isFullscreen = ref(false);
const appearanceOpen = ref(false);
const viewportRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

const { activeSize, isCustom, sizedMarkup, setWidth, setHeight, resetSize } = useImageSize(
  computed(() => props.svg),
  computed(() => props.previewBackground),
);

const previewMarkup = computed(() => {
  const markup = sizedMarkup.value;
  if (!markup) {
    return "";
  }
  return sanitizeSvgForPreview(markup);
});

const {
  contentStyle,
  isDragging,
  isPinching,
  zoomPercent,
  snapshot,
  zoomIn,
  zoomOut,
  setCameraFrame,
  readCameraFrame,
  setInteractionLocked,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
} = usePreviewPanZoom(viewportRef, contentRef, previewMarkup);

const presentation = usePresentationSession({
  source: toRef(props, "source"),
  format: toRef(props, "diagramFormat"),
  canEdit: computed(() => props.canEditPresentation === true),
  readFrame: () => readCameraFrame(),
  setFrame: setCameraFrame,
  setLocked: setInteractionLocked,
  onSource: (value) => emit("update:source", value),
  getGifContext: () => {
    const viewport = viewportRef.value;
    if (!viewport || !previewMarkup.value) {
      return null;
    }
    const style = getComputedStyle(viewport);
    return {
      svg: previewMarkup.value,
      imageWidth: snapshot.value.imageWidth,
      imageHeight: snapshot.value.imageHeight,
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      theme: {
        background: props.previewBackground,
        accent: style.getPropertyValue("--accent").trim() || "#0f6cbd",
        surface: style.getPropertyValue("--surface").trim() || "#ffffff",
        text: style.getPropertyValue("--text").trim() || "#1a1f24",
      },
    };
  },
});
provide(presentationSessionKey, presentation);

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

watch(
  () => props.expandSignal,
  (value, previous) => {
    if (props.dualScreenActive) {
      return;
    }
    if (value != null && value > 0 && value !== previous) {
      isFullscreen.value = true;
    }
  },
);

watch(
  () => props.dualScreenActive,
  (active) => {
    if (active) {
      isFullscreen.value = false;
    }
  },
);
</script>

<template>
  <section
    class="panel preview-panel"
    :class="{
      'is-fullscreen': isFullscreen,
      'is-presentation-view': presentation.dimChrome.value,
      'is-chrome-revealed': presentation.chromeRevealed.value,
    }"
    :aria-label="t('app.previewRegion')"
    @pointerdown="presentation.revealChrome"
  >
    <header class="panel-header">
      <h2
        class="panel-title"
        :title="t('preview.titleTooltip')"
      >
        {{ t("preview.title") }}
      </h2>
      <div class="panel-header__toolbar">
        <DiagramToolbar
          :is-rendering="isRendering"
          :can-export="canExport"
          :preview-background="previewBackground"
          :diagram-dark-mode="diagramDarkMode"
          :render-mode="renderMode"
          :zoom-percent="zoomPercent"
          :image-width="activeSize.width"
          :image-height="activeSize.height"
          :image-size-custom="isCustom"
          :copy-png="copyPng"
          @render-now="emit('renderNow')"
          @export-svg="emit('exportSvg')"
          @export-png="emit('exportPng')"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @set-image-width="setWidth"
          @set-image-height="setHeight"
          @reset-image-size="resetSize"
          @open-appearance="appearanceOpen = true"
          @update:preview-background="emit('update:previewBackground', $event)"
          @update:diagram-dark-mode="emit('update:diagramDarkMode', $event)"
          @update:render-mode="emit('update:renderMode', $event)"
        />
        <span
          v-if="isRendering"
          class="status-pill status-pill--compact"
        >…</span>
      </div>
      <PanelDualScreenButton
        v-if="showDualScreen"
        :active="Boolean(dualScreenActive)"
        @toggle="emit('toggleDualScreen')"
      />
      <PanelFullscreenButton
        :active="isFullscreen"
        @toggle="toggleFullscreen"
      />
    </header>

    <div class="panel-body">
      <div
        v-if="blockedMessage"
        class="preview-placeholder"
      >
        {{ blockedMessage }}
      </div>
      <div
        v-else-if="error"
        class="preview-error"
      >
        {{ error }}
      </div>
      <div
        v-else-if="isRendering && !previewMarkup"
        class="preview-frame preview-frame--loading"
        :class="{ 'is-transparent-bg': transparentPreview }"
      >
        <LoadingState :message="t('preview.rendering')" />
      </div>
      <div
        v-else-if="previewMarkup"
        class="preview-frame"
        :class="{ 'is-transparent-bg': transparentPreview }"
      >
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
            :data-preview-ready="Boolean(previewMarkup)"
            :style="contentStyle"
            v-html="previewMarkup"
          />
          <PresentationStage
            v-if="presentation.enabled.value"
            :snapshot="snapshot"
            :track="presentation.currentTrack.value"
            :editing="presentation.mode.value === 'edit' && props.canEditPresentation === true"
            :show-overlays="presentation.document.value?.showOverlays !== false"
            :viewpoint-index="presentation.playback.viewpointIndex.value"
            :phase="presentation.playback.phase.value"
            :travel-origin="presentation.playback.travelOrigin.value"
            :selected-overlay-id="presentation.selectedOverlayId.value"
            :add-point-armed="presentation.addPointArmed.value"
            @insert-point="presentation.onInsertPoint"
            @move-point="presentation.onMovePoint"
            @move-control="presentation.onMoveControl"
            @select-overlay="presentation.selectedOverlayId.value = $event"
            @change-overlay="presentation.onChangeOverlay"
          />
        </div>
        <PresentationPanel :t="t" />
        <div
          v-if="isRendering"
          class="preview-loading-overlay"
        >
          <LoadingState
            compact
            :message="t('preview.rendering')"
          />
        </div>
      </div>
      <div
        v-else
        class="preview-placeholder"
      >
        {{ t("preview.placeholder") }}
      </div>
    </div>

    <AppearanceModal
      :open="appearanceOpen"
      :background="previewBackground"
      :text-color="textColor"
      :font-family="diagramFontFamily"
      :font-weight="diagramFontWeight"
      :font-style="diagramFontStyle"
      @close="appearanceOpen = false"
      @update:background="emit('update:previewBackground', $event)"
      @update:text-color="emit('update:textColor', $event)"
      @update:font-family="emit('update:diagramFontFamily', $event)"
      @update:font-weight="emit('update:diagramFontWeight', $event)"
      @update:font-style="emit('update:diagramFontStyle', $event)"
    />
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

.preview-frame {
  position: relative;
}

.preview-frame--loading {
  display: grid;
  place-items: center;
  min-height: 240px;
}

.preview-loading-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
}

.preview-content {
  will-change: transform;
}

.preview-panel.is-presentation-view > .panel-header,
.preview-panel.is-presentation-view :deep(.presentation-dock) {
  opacity: 0.12;
  transition: opacity 180ms ease;
}

.preview-panel.is-presentation-view > .panel-header:hover,
.preview-panel.is-presentation-view > .panel-header:focus-within,
.preview-panel.is-presentation-view.is-chrome-revealed > .panel-header,
.preview-panel.is-presentation-view :deep(.presentation-dock:hover),
.preview-panel.is-presentation-view :deep(.presentation-dock:focus-within),
.preview-panel.is-presentation-view.is-chrome-revealed :deep(.presentation-dock) {
  opacity: 1;
}
</style>
