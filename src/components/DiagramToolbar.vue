<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from "vue";
import DiagramSizeControls from "@/components/DiagramSizeControls.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import FileBadgeIcon from "@/components/icons/FileBadgeIcon.vue";
import IconButton from "@/components/IconButton.vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import { useLocale } from "@/composables/useLocale";
import {
  DEFAULT_PREVIEW_BG,
  isTransparentPreviewBg,
} from "@/constants/editor-settings";
import {
  RENDER_MODES,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { PREVIEW_MIN_ZOOM } from "@/constants/preview-pan-zoom";
import { contrastTextColor } from "@/services/mermaid/ext/common";

const props = defineProps<{
  isRendering: boolean;
  canExport: boolean;
  previewBackground: string;
  diagramDarkMode: boolean;
  renderMode: RenderMode;
  zoomPercent?: number;
  imageWidth?: number;
  imageHeight?: number;
  imageSizeCustom?: boolean;
  copyPng: () => Promise<boolean>;
}>();

const COPY_PNG_ACK_MS = 1600;

const emit = defineEmits<{
  exportSvg: [];
  exportPng: [];
  renderNow: [];
  zoomIn: [];
  zoomOut: [];
  setZoomPercent: [percent: number];
  setImageWidth: [value: number];
  setImageHeight: [value: number];
  resetImageSize: [];
  openAppearance: [];
  "update:previewBackground": [value: string];
  "update:diagramDarkMode": [value: boolean];
  "update:renderMode": [value: RenderMode];
}>();

const { t } = useLocale();

const MIN_ZOOM_PERCENT = Math.round(PREVIEW_MIN_ZOOM * 100);

const editingZoom = ref(false);
const zoomDraft = ref("");
const zoomInputRef = ref<HTMLInputElement | null>(null);
let zoomEditCancelled = false;
let zoomCommitInFlight = false;

function parseZoomPercent(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(MIN_ZOOM_PERCENT, Math.round(value));
}

function startZoomEdit(): void {
  if (props.zoomPercent === undefined) {
    return;
  }
  zoomEditCancelled = false;
  zoomDraft.value = String(props.zoomPercent);
  editingZoom.value = true;
  void nextTick(() => {
    const input = zoomInputRef.value;
    input?.focus();
    input?.select();
  });
}

function cancelZoomEdit(): void {
  zoomEditCancelled = true;
  editingZoom.value = false;
  zoomInputRef.value?.blur();
}

function commitZoomEdit(): void {
  if (zoomEditCancelled) {
    zoomEditCancelled = false;
    return;
  }
  if (!editingZoom.value || zoomCommitInFlight) {
    return;
  }
  zoomCommitInFlight = true;
  editingZoom.value = false;
  try {
    const percent = parseZoomPercent(zoomDraft.value);
    if (percent !== null && percent !== props.zoomPercent) {
      emit("setZoomPercent", percent);
    }
  } finally {
    zoomCommitInFlight = false;
  }
}

const isOnlineMode = computed(() => isOnlineRenderMode(props.renderMode));
const isTransparentBg = computed(() => isTransparentPreviewBg(props.previewBackground));

const defaultPreviewBg = computed(() =>
  props.diagramDarkMode ? DEFAULT_PREVIEW_BG.dark : DEFAULT_PREVIEW_BG.light,
);

const customPreviewBg = computed(() =>
  isTransparentBg.value ? defaultPreviewBg.value : props.previewBackground,
);

const previewTextColor = computed(() => {
  if (isTransparentBg.value) return props.diagramDarkMode ? "#e6edf3" : "#1f2328";
  return contrastTextColor(props.previewBackground) ?? (props.diagramDarkMode ? "#e6edf3" : "#1f2328");
});

const themeToggleLabel = computed(() =>
  props.diagramDarkMode ? t("toolbar.themeToLight") : t("toolbar.themeToDark"),
);

const renderModeToggleLabel = computed(() =>
  isOnlineMode.value
    ? t("toolbar.renderModeToOffline")
    : t("toolbar.renderModeToOnline"),
);

function toggleDiagramTheme(): void {
  emit("update:diagramDarkMode", !props.diagramDarkMode);
}

function toggleRenderMode(): void {
  emit(
    "update:renderMode",
    isOnlineMode.value ? RENDER_MODES.offline : RENDER_MODES.online,
  );
}

const copiedPng = ref(false);
let copyAckTimer = 0;
let copyInFlight = false;

onUnmounted(() => {
  window.clearTimeout(copyAckTimer);
});

function onCopyPng(): void {
  void acknowledgeCopiedPng();
}

async function acknowledgeCopiedPng(): Promise<void> {
  if (copyInFlight) {
    return;
  }
  copyInFlight = true;
  try {
    const copied = await props.copyPng();
    if (!copied) {
      return;
    }
    copiedPng.value = true;
    window.clearTimeout(copyAckTimer);
    copyAckTimer = window.setTimeout(() => {
      copiedPng.value = false;
    }, COPY_PNG_ACK_MS);
  } finally {
    copyInFlight = false;
  }
}
</script>

<template>
  <div class="preview-toolbar">
    <TooltipWrap :label="t('toolbar.appearance')">
      <button
        type="button"
        class="preview-toolbar__appearance"
        :aria-label="t('toolbar.appearance')"
        @click="emit('openAppearance')"
      >
        <span
          class="preview-toolbar__appearance-swatch"
          :class="{ 'is-transparent': isTransparentBg }"
          :style="{ '--swatch-color': customPreviewBg }"
        >
          <span
            class="preview-toolbar__appearance-glyph"
            :style="{ color: previewTextColor }"
          >A</span>
        </span>
      </button>
    </TooltipWrap>

    <IconButton
      :label="t('toolbar.zoomOut')"
      @click="emit('zoomOut')"
    >
      <ActionIcon name="zoom-out" />
    </IconButton>

    <TooltipWrap
      v-if="zoomPercent !== undefined && !editingZoom"
      :label="t('toolbar.zoomLevelEdit')"
    >
      <button
        type="button"
        class="preview-toolbar__zoom-level"
        aria-live="polite"
        aria-atomic="true"
        :aria-label="t('toolbar.zoomLevel', { percent: zoomPercent })"
        @click="startZoomEdit"
      >
        {{ zoomPercent }}%
      </button>
    </TooltipWrap>
    <label
      v-else-if="editingZoom"
      class="preview-toolbar__zoom-editor"
    >
      <input
        ref="zoomInputRef"
        v-model="zoomDraft"
        class="preview-toolbar__zoom-input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        spellcheck="false"
        :aria-label="t('toolbar.zoomLevelEdit')"
        @keydown.enter.prevent="commitZoomEdit"
        @keydown.escape.prevent="cancelZoomEdit"
        @blur="commitZoomEdit"
      >
      <span
        class="preview-toolbar__zoom-unit"
        aria-hidden="true"
      >%</span>
    </label>

    <IconButton
      :label="t('toolbar.zoomIn')"
      @click="emit('zoomIn')"
    >
      <ActionIcon name="zoom-in" />
    </IconButton>

    <DiagramSizeControls
      :image-width="imageWidth"
      :image-height="imageHeight"
      :image-size-custom="imageSizeCustom"
      @set-image-width="emit('setImageWidth', $event)"
      @set-image-height="emit('setImageHeight', $event)"
      @reset-image-size="emit('resetImageSize')"
    />

    <IconButton
      :label="themeToggleLabel"
      :pressed="diagramDarkMode"
      @click="toggleDiagramTheme"
    >
      <ActionIcon
        :name="diagramDarkMode ? 'sun' : 'moon'"
        size="large"
      />
    </IconButton>

    <IconButton
      :label="renderModeToggleLabel"
      :pressed="isOnlineMode"
      @click="toggleRenderMode"
    >
      <ActionIcon
        :name="isOnlineMode ? 'globe' : 'unlink'"
        size="large"
      />
    </IconButton>

    <IconButton
      :label="t('toolbar.refresh')"
      :disabled="isRendering"
      @click="emit('renderNow')"
    >
      <ActionIcon name="refresh" />
    </IconButton>

    <IconButton
      :label="t('toolbar.exportSvg')"
      primary
      format
      :disabled="!canExport"
      @click="emit('exportSvg')"
    >
      <FileBadgeIcon format="SVG" />
    </IconButton>

    <IconButton
      :label="t('toolbar.exportPng')"
      primary
      format
      :disabled="!canExport"
      @click="emit('exportPng')"
    >
      <FileBadgeIcon format="PNG" />
    </IconButton>

    <IconButton
      :label="copiedPng ? t('toolbar.copyPngDone') : t('toolbar.copyPng')"
      primary
      format
      :disabled="!canExport"
      :pressed="copiedPng"
      @click="onCopyPng"
    >
      <ActionIcon :name="copiedPng ? 'check' : 'clipboard-copy'" />
    </IconButton>
  </div>
</template>

<style scoped>
.preview-toolbar {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
  gap: 4px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.preview-toolbar > * {
  flex-shrink: 0;
}

.preview-toolbar__zoom-level {
  min-width: 3.2rem;
  height: 32px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  cursor: pointer;
}

.preview-toolbar__zoom-level:hover,
.preview-toolbar__zoom-level:focus-visible {
  border-color: var(--border);
  background: var(--surface);
  color: var(--text);
}

.preview-toolbar__zoom-editor {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 0 6px 0 2px;
  border: 1px solid var(--accent, #8250df);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
}

.preview-toolbar__zoom-input {
  width: 3.2rem;
  height: 100%;
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.preview-toolbar__zoom-input:focus {
  outline: none;
}

.preview-toolbar__zoom-unit {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
}
</style>
