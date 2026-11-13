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
import { isFeatureAllowed } from "@/composables/useFeatureGate";
import { useImageSize } from "@/composables/useImageSize";
import { usePresentationSession } from "@/composables/usePresentationSession";
import { usePreviewPanZoom } from "@/composables/usePreviewPanZoom";
import { isTransparentPreviewBg, TRANSPARENT_PREVIEW_BG } from "@/constants/editor-settings";
import { EFFECT_IDENTITY, effectStyle, effectVisualAt } from "@/services/presentation/effects";
import { readFrameFile, readFrameHref } from "@/services/presentation/frame";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { sanitizeSvgForPreview } from "@/utils/export";
import { onlineRenderSiteFor } from "@/utils/online-render-site";

const props = defineProps<{
  svg: string;
  error: string;
  isRendering: boolean;
  canExport: boolean;
  previewBackground: string;
  diagramDarkMode: boolean;
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
  /** Drop SVG/PNG создаёт новую диаграмму. Во втором окне превью выключен. */
  acceptFrameDrop?: boolean;
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
  "update:imageSize": [value: { width: number; height: number } | null];
  renderOnline: [];
  toggleDualScreen: [];
  "update:source": [value: string];
  importFrame: [payload: { label: string; source: string }];
}>();

const { t } = useLocale();
const onlineRenderLabel = computed(() => {
  const site = onlineRenderSiteFor(props.diagramFormat, props.source ?? "");
  return site ? t("toolbar.renderOnline", { site }) : "";
});
const transparentPreview = computed(() => isTransparentPreviewBg(props.previewBackground));
const isFullscreen = ref(false);
const appearanceOpen = ref(false);
const viewportRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

const frameHref = computed(() => readFrameHref(props.source ?? ""));
const frameError = ref("");
const frameDragOver = ref(false);
const { activeSize, isCustom, sizedMarkup, setWidth, setHeight, resetSize } = useImageSize(
  computed(() => props.svg),
  computed(() => (frameHref.value ? TRANSPARENT_PREVIEW_BG : props.previewBackground)),
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
  setZoomPercent,
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
      frameHref: frameHref.value,
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

function onTogglePresentation(): void {
  if (!isFeatureAllowed("editor.presentation")) {
    return;
  }
  presentation.togglePanel();
}

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

const effectsLive = computed(
  () => presentation.playback.playing.value || presentation.playback.animating.value,
);

function sceneStyle(target: "frame" | "diagram"): Record<string, string> {
  if (!effectsLive.value || presentation.playback.phase.value !== "dwell") {
    return effectStyle(EFFECT_IDENTITY);
  }
  const viewpoint = presentation.currentTrack.value?.viewpoints[
    presentation.playback.viewpointIndex.value
  ];
  return effectStyle(
    effectVisualAt(
      viewpoint?.effects ?? [],
      presentation.playback.phaseElapsedMs.value,
      target,
    ),
  );
}

function onFrameDragOver(event: DragEvent): void {
  if (!props.acceptFrameDrop || props.blockedMessage) {
    return;
  }
  event.preventDefault();
  frameDragOver.value = true;
}

function onFrameDragLeave(): void {
  frameDragOver.value = false;
}

async function onFrameDrop(event: DragEvent): Promise<void> {
  if (!props.acceptFrameDrop || props.blockedMessage) {
    return;
  }
  event.preventDefault();
  frameDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) {
    return;
  }
  const result = await readFrameFile(file);
  if (!result.ok) {
    frameError.value = t(result.errorKey);
    return;
  }
  frameError.value = "";
  emit("importFrame", { label: result.label, source: result.source });
}

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
      'is-header-held': presentation.headerDimHeld.value,
      'is-chrome-revealed': presentation.chromeRevealed.value,
    }"
    :aria-label="t('app.previewRegion')"
    @pointerdown="presentation.revealChrome"
    @dragover="onFrameDragOver"
    @dragleave="onFrameDragLeave"
    @drop="onFrameDrop"
  >
    <header
      class="panel-header"
      @pointerenter="presentation.releaseHeaderDim()"
      @pointerdown="presentation.releaseHeaderDim()"
    >
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
          :zoom-percent="zoomPercent"
          :image-width="activeSize.width"
          :image-height="activeSize.height"
          :image-size-custom="isCustom"
          :copy-png="copyPng"
          :presentation-enabled="presentation.enabled.value"
          :presentation-open="presentation.panelOpen.value"
          :online-render-label="onlineRenderLabel"
          @toggle-presentation="onTogglePresentation"
          @render-now="emit('renderNow')"
          @render-online="emit('renderOnline')"
          @export-svg="emit('exportSvg')"
          @export-png="emit('exportPng')"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @set-zoom-percent="setZoomPercent"
          @set-image-width="setWidth"
          @set-image-height="setHeight"
          @reset-image-size="resetSize"
          @open-appearance="appearanceOpen = true"
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
          >
            <div class="preview-scene">
              <img
                v-if="frameHref"
                class="preview-scene__frame"
                :src="frameHref"
                alt=""
                :style="sceneStyle('frame')"
              >
              <div
                class="preview-scene__diagram"
                :style="sceneStyle('diagram')"
                v-html="previewMarkup"
              />
            </div>
          </div>
          <PresentationStage
            v-if="presentation.enabled.value"
            :snapshot="snapshot"
            :effects-live="effectsLive"
            :effect-elapsed-ms="presentation.playback.phaseElapsedMs.value"
            :track="presentation.currentTrack.value"
            :arranging="presentation.arranging.value"
            :editing="presentation.editing.value"
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
        <p
          v-if="frameError"
          class="preview-frame-error"
        >
          {{ frameError }}
        </p>
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
        {{ frameError || t("preview.placeholder") }}
      </div>
      <p
        v-if="frameDragOver"
        class="preview-drop"
      >
        {{ t("preview.frame.drop") }}
      </p>
    </div>

    <AppearanceModal
      :open="appearanceOpen"
      :background="previewBackground"
      :text-color="textColor"
      :font-family="diagramFontFamily"
      :font-weight="diagramFontWeight"
      :font-style="diagramFontStyle"
      :diagram-dark-mode="diagramDarkMode"
      @close="appearanceOpen = false"
      @update:background="emit('update:previewBackground', $event)"
      @update:text-color="emit('update:textColor', $event)"
      @update:font-family="emit('update:diagramFontFamily', $event)"
      @update:font-weight="emit('update:diagramFontWeight', $event)"
      @update:font-style="emit('update:diagramFontStyle', $event)"
      @update:diagram-dark-mode="emit('update:diagramDarkMode', $event)"
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

.preview-scene {
  position: relative;
  display: inline-block;
}

.preview-scene__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
}

.preview-scene__diagram {
  position: relative;
}

.preview-frame-error {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  margin: 0;
  color: var(--danger);
  text-align: center;
}

.preview-drop {
  position: absolute;
  inset: 12px;
  display: grid;
  place-items: center;
  margin: 0;
  border: 2px dashed var(--accent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  color: var(--text);
  pointer-events: none;
}

.panel-body {
  position: relative;
}

.preview-panel.is-presentation-view > .panel-header {
  opacity: 0.12;
  transition: none;
}

.preview-panel.is-presentation-view:not(.is-header-held) > .panel-header:hover,
.preview-panel.is-presentation-view.is-chrome-revealed > .panel-header {
  opacity: 1;
}
</style>
