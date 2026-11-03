<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import FileBadgeIcon from "@/components/icons/FileBadgeIcon.vue";
import IconButton from "@/components/IconButton.vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import {
  RENDER_MODES,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import {
  DEFAULT_PREVIEW_BG,
  PREVIEW_BG_PRESETS,
  TRANSPARENT_PREVIEW_BG,
  isTransparentPreviewBg,
} from "@/constants/editor-settings";
import { useLocale } from "@/composables/useLocale";

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
}>();

const emit = defineEmits<{
  exportSvg: [];
  exportPng: [];
  renderNow: [];
  zoomIn: [];
  zoomOut: [];
  setImageWidth: [value: number];
  setImageHeight: [value: number];
  resetImageSize: [];
  "update:previewBackground": [value: string];
  "update:diagramDarkMode": [value: boolean];
  "update:renderMode": [value: RenderMode];
}>();

const { t } = useLocale();

const isOnlineMode = computed(() => isOnlineRenderMode(props.renderMode));

const isTransparentBg = computed(() => isTransparentPreviewBg(props.previewBackground));

const defaultPreviewBg = computed(() =>
  props.diagramDarkMode ? DEFAULT_PREVIEW_BG.dark : DEFAULT_PREVIEW_BG.light,
);

/** Свой цвет — тот, что не совпал ни с одной преднастроенной кнопкой. */
const isCustomBg = computed(() => {
  if (isTransparentBg.value) return false;
  const current = props.previewBackground.trim().toLowerCase();
  return !PREVIEW_BG_PRESETS.some((preset) => preset.value.toLowerCase() === current);
});

const customPreviewBg = computed(() =>
  isCustomBg.value ? props.previewBackground : defaultPreviewBg.value,
);

function setPreviewBackground(value: string): void {
  emit("update:previewBackground", value);
}

function onCustomColorInput(event: Event): void {
  setPreviewBackground((event.target as HTMLInputElement).value);
}

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

const sizeMenuOpen = ref(false);

const imageSizeLabel = computed(() =>
  props.imageWidth && props.imageHeight
    ? `${props.imageWidth}×${props.imageHeight}`
    : "—",
);

const imageSizeTitle = computed(() =>
  t("toolbar.imageSize", { size: imageSizeLabel.value }),
);

const sizeRef = ref<HTMLElement | null>(null);
const sizeButtonRef = ref<HTMLElement | null>(null);
const sizeMenuStyle = ref<Record<string, string>>({});

/** Меню — position: fixed, поэтому координаты считаем от кнопки. */
function positionSizeMenu(): void {
  const button = sizeButtonRef.value;
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const menuWidth = 220;
  const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
  sizeMenuStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(rect.bottom + 6)}px`,
    width: `${menuWidth}px`,
  };
}

function toggleSizeMenu(): void {
  sizeMenuOpen.value = !sizeMenuOpen.value;
  if (sizeMenuOpen.value) {
    positionSizeMenu();
  }
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!sizeMenuOpen.value) return;
  const root = sizeRef.value;
  if (root && event.target instanceof Node && root.contains(event.target)) return;
  sizeMenuOpen.value = false;
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && sizeMenuOpen.value) {
    sizeMenuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("keydown", onDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  document.removeEventListener("keydown", onDocumentKeydown);
});

function onSizeInput(axis: "width" | "height", event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value) || value <= 0) return;
  if (axis === "width") emit("setImageWidth", value);
  else emit("setImageHeight", value);
}

function resetSize(): void {
  emit("resetImageSize");
  sizeMenuOpen.value = false;
}

function toggleRenderMode(): void {
  emit(
    "update:renderMode",
    isOnlineMode.value ? RENDER_MODES.offline : RENDER_MODES.online,
  );
}
</script>

<template>
  <div class="preview-toolbar">
    <div class="preview-toolbar__bg" role="group" :aria-label="t('toolbar.previewBackground')">
      <TooltipWrap
        v-for="preset in PREVIEW_BG_PRESETS"
        :key="preset.id"
        :label="t(`toolbar.previewBackgroundPreset.${preset.id}`)"
      >
        <button
          type="button"
          class="preview-toolbar__swatch"
          :class="{ 'is-active': !isTransparentBg && !isCustomBg && preset.value === previewBackground }"
          :style="{ '--swatch-color': preset.value }"
          :aria-label="t(`toolbar.previewBackgroundPreset.${preset.id}`)"
          :aria-pressed="!isTransparentBg && !isCustomBg && preset.value === previewBackground"
          @click="setPreviewBackground(preset.value)"
        >
          <span class="preview-toolbar__swatch-dot" />
        </button>
      </TooltipWrap>

      <TooltipWrap :label="t('toolbar.previewBackgroundCustom')">
        <label
          class="preview-toolbar__swatch preview-toolbar__swatch--custom"
          :class="{ 'is-active': isCustomBg }"
          :style="{ '--swatch-color': customPreviewBg }"
        >
          <span class="sr-only">{{ t("toolbar.previewBackgroundCustom") }}</span>
          <input
            class="preview-toolbar__color"
            type="color"
            :value="customPreviewBg"
            :aria-label="t('toolbar.previewBackgroundCustom')"
            @input="onCustomColorInput"
          />
        </label>
      </TooltipWrap>

      <TooltipWrap :label="t('toolbar.previewBackgroundTransparent')">
        <button
          type="button"
          class="preview-toolbar__swatch preview-toolbar__swatch--transparent"
          :class="{ 'is-active': isTransparentBg }"
          :aria-label="t('toolbar.previewBackgroundTransparent')"
          :aria-pressed="isTransparentBg"
          @click="setPreviewBackground(TRANSPARENT_PREVIEW_BG)"
        >
          <ActionIcon name="eye-off" />
        </button>
      </TooltipWrap>
    </div>

    <IconButton :label="t('toolbar.zoomOut')" @click="emit('zoomOut')">
      <ActionIcon name="zoom-out" />
    </IconButton>

    <span
      v-if="zoomPercent !== undefined"
      class="preview-toolbar__zoom-level"
      aria-live="polite"
      aria-atomic="true"
      :aria-label="t('toolbar.zoomLevel', { percent: zoomPercent })"
    >
      {{ zoomPercent }}%
    </span>

    <IconButton :label="t('toolbar.zoomIn')" @click="emit('zoomIn')">
      <ActionIcon name="zoom-in" />
    </IconButton>

    <div ref="sizeRef" class="preview-toolbar__size">
      <TooltipWrap :label="imageSizeTitle">
        <button
          ref="sizeButtonRef"
          type="button"
          class="preview-toolbar__size-button"
          :class="{ 'is-custom': imageSizeCustom }"
          :aria-expanded="sizeMenuOpen"
          @click="toggleSizeMenu"
        >
          {{ imageSizeLabel }}
        </button>
      </TooltipWrap>
      <div v-if="sizeMenuOpen" class="preview-toolbar__size-menu" :style="sizeMenuStyle">
        <label class="preview-toolbar__size-row">
          <span>{{ t("toolbar.imageWidth") }}</span>
          <input
            type="number"
            min="64"
            max="4096"
            step="10"
            :value="imageWidth"
            @change="onSizeInput('width', $event)"
          />
        </label>
        <label class="preview-toolbar__size-row">
          <span>{{ t("toolbar.imageHeight") }}</span>
          <input
            type="number"
            min="64"
            max="4096"
            step="10"
            :value="imageHeight"
            @change="onSizeInput('height', $event)"
          />
        </label>
        <button type="button" class="preview-toolbar__size-reset" @click="resetSize">
          {{ t("toolbar.imageSizeReset") }}
        </button>
      </div>
    </div>

    <IconButton
      :label="themeToggleLabel"
      :pressed="diagramDarkMode"
      @click="toggleDiagramTheme"
    >
      <ActionIcon :name="diagramDarkMode ? 'sun' : 'moon'" size="large" />
    </IconButton>

    <IconButton
      :label="renderModeToggleLabel"
      :pressed="isOnlineMode"
      @click="toggleRenderMode"
    >
      <ActionIcon :name="isOnlineMode ? 'globe' : 'unlink'" size="large" />
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
  </div>
</template>

<style scoped>
.preview-toolbar {
  display: flex;
  flex: 1;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.preview-toolbar__bg {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.preview-toolbar__swatch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
}

.preview-toolbar__swatch:hover {
  border-color: var(--text-muted);
}

.preview-toolbar__swatch.is-active {
  border-color: var(--accent, #8250df);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent, #8250df) 35%, transparent);
}

.preview-toolbar__swatch-dot {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgb(0 0 0 / 12%);
  background: var(--swatch-color);
}

.preview-toolbar__swatch--custom {
  overflow: hidden;
}

.preview-toolbar__swatch--custom::after {
  content: "";
  position: absolute;
  inset: 4px;
  border-radius: 4px;
  border: 1px solid rgb(0 0 0 / 12%);
  background: var(--swatch-color);
  pointer-events: none;
}

.preview-toolbar__swatch--transparent {
  background-image:
    linear-gradient(45deg, var(--preview-checker) 25%, transparent 25%),
    linear-gradient(-45deg, var(--preview-checker) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--preview-checker) 75%),
    linear-gradient(-45deg, transparent 75%, var(--preview-checker) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}

.preview-toolbar__color-field {
  display: inline-flex;
  margin: 0;
  flex-shrink: 0;
}

.preview-toolbar__zoom-level {
  min-width: 3.2rem;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.preview-toolbar__size {
  position: relative;
  flex-shrink: 0;
}

.preview-toolbar__size-button {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  white-space: nowrap;
}

.preview-toolbar__size-button.is-custom {
  border-color: var(--accent, #8250df);
  color: var(--text);
}

.preview-toolbar__size-menu {
  /* fixed, а не absolute: тулбар (.panel-header__toolbar) скроллится по X
     через overflow-x: auto и обрезал бы меню — оно «не открывалось». */
  position: fixed;
  z-index: 60;
  display: grid;
  gap: 8px;
  min-width: 200px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
}

.preview-toolbar__size-row {
  display: grid;
  grid-template-columns: 1fr 80px;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.preview-toolbar__size-row input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.preview-toolbar__size-reset {
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
}

.preview-toolbar__color {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: pointer;
}

.preview-toolbar__color:disabled {
  opacity: 0.45;
  cursor: default;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
