<script setup lang="ts">
import { computed, ref } from "vue";
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

const transparentBgLabel = computed(() =>
  isTransparentBg.value
    ? t("toolbar.previewBackgroundOpaque")
    : t("toolbar.previewBackgroundTransparent"),
);

function toggleTransparentBackground(): void {
  emit(
    "update:previewBackground",
    isTransparentBg.value
      ? props.diagramDarkMode
        ? DEFAULT_PREVIEW_BG.dark
        : DEFAULT_PREVIEW_BG.light
      : TRANSPARENT_PREVIEW_BG,
  );
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

function toggleSizeMenu(): void {
  sizeMenuOpen.value = !sizeMenuOpen.value;
}

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
    <TooltipWrap :label="t('toolbar.previewBackground')">
      <label class="preview-toolbar__color-field">
        <span class="sr-only">{{ t("toolbar.previewBackground") }}</span>
        <input
          class="preview-toolbar__color"
          type="color"
          :value="isTransparentBg ? (diagramDarkMode ? DEFAULT_PREVIEW_BG.dark : DEFAULT_PREVIEW_BG.light) : previewBackground"
          :disabled="isTransparentBg"
          @input="
            emit(
              'update:previewBackground',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </label>
    </TooltipWrap>

    <IconButton
      :label="transparentBgLabel"
      :pressed="isTransparentBg"
      @click="toggleTransparentBackground"
    >
      <ActionIcon :name="isTransparentBg ? 'eye-off' : 'eye'" />
    </IconButton>

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

    <div class="preview-toolbar__size">
      <TooltipWrap :label="imageSizeTitle">
        <button
          type="button"
          class="preview-toolbar__size-button"
          :class="{ 'is-custom': imageSizeCustom }"
          :aria-expanded="sizeMenuOpen"
          @click="toggleSizeMenu"
        >
          {{ imageSizeLabel }}
        </button>
      </TooltipWrap>
      <div v-if="sizeMenuOpen" class="preview-toolbar__size-menu">
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
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
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
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
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
