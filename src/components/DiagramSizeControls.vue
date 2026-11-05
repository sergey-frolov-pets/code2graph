<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import { useLocale } from "@/composables/useLocale";
import {
  IMAGE_ASPECT_PRESETS,
  aspectRatiosMatch,
  parseAspectRatio,
  type AspectRatio,
} from "@/utils/export";

const props = defineProps<{
  imageWidth?: number;
  imageHeight?: number;
  imageSizeCustom?: boolean;
}>();

const emit = defineEmits<{
  setImageWidth: [value: number];
  setImageHeight: [value: number];
  setImageAspect: [ratio: AspectRatio];
  resetImageSize: [];
}>();

const { t } = useLocale();

const sizeMenuOpen = ref(false);
const sizeRef = ref<HTMLElement | null>(null);
const sizeButtonRef = ref<HTMLElement | null>(null);
const sizeMenuStyle = ref<Record<string, string>>({});
const customAspect = ref("");
const aspectError = ref("");

const aspectPresets = IMAGE_ASPECT_PRESETS;

const activePreset = computed(() => {
  const width = props.imageWidth;
  const height = props.imageHeight;
  if (!width || !height) return null;
  return aspectPresets.find((preset) => aspectRatiosMatch({ width, height }, preset)) ?? null;
});

const imageSizeLabel = computed(() =>
  props.imageWidth && props.imageHeight
    ? `${props.imageWidth}×${props.imageHeight}`
    : "—",
);

const imageSizeTitle = computed(() =>
  t("toolbar.imageSize", { size: imageSizeLabel.value }),
);

function positionSizeMenu(): void {
  const button = sizeButtonRef.value;
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const menuWidth = 280;
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

function isPresetActive(preset: AspectRatio): boolean {
  const current = activePreset.value;
  return current?.width === preset.width && current.height === preset.height;
}

function applyAspect(ratio: AspectRatio): void {
  aspectError.value = "";
  emit("setImageAspect", ratio);
}

function onAspectInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  customAspect.value = value;
  const ratio = parseAspectRatio(value);
  if (!ratio) {
    aspectError.value = value.trim() ? t("toolbar.imageAspectInvalid") : "";
    return;
  }

  applyAspect(ratio);
}

function resetSize(): void {
  customAspect.value = "";
  aspectError.value = "";
  emit("resetImageSize");
  sizeMenuOpen.value = false;
}
</script>

<template>
  <div
    ref="sizeRef"
    class="preview-toolbar__size"
  >
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
    <div
      v-if="sizeMenuOpen"
      class="preview-toolbar__size-menu"
      :style="sizeMenuStyle"
    >
      <label class="preview-toolbar__size-row">
        <span>{{ t("toolbar.imageWidth") }}</span>
        <input
          type="number"
          min="64"
          max="4096"
          step="10"
          :value="imageWidth"
          @change="onSizeInput('width', $event)"
        >
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
        >
      </label>
      <p class="preview-toolbar__aspect-label">
        {{ t("toolbar.imageAspect") }}
      </p>
      <div
        class="preview-toolbar__aspect-presets"
        role="group"
        :aria-label="t('toolbar.imageAspect')"
      >
        <button
          v-for="preset in aspectPresets"
          :key="`${preset.width}x${preset.height}`"
          type="button"
          class="preview-toolbar__aspect-preset"
          :class="{ 'is-active': isPresetActive(preset) }"
          :aria-pressed="isPresetActive(preset)"
          @click="applyAspect(preset)"
        >
          {{ preset.width }}×{{ preset.height }}
        </button>
      </div>
      <label class="preview-toolbar__aspect-custom">
        <span>{{ t("toolbar.imageAspectCustom") }}</span>
        <input
          type="text"
          :placeholder="t('toolbar.imageAspectPlaceholder')"
          :value="customAspect"
          :aria-invalid="Boolean(aspectError)"
          @change="onAspectInput"
          @keydown.enter.prevent="onAspectInput"
        >
      </label>
      <p
        v-if="aspectError"
        class="preview-toolbar__aspect-error"
      >
        {{ aspectError }}
      </p>
      <p class="preview-toolbar__aspect-hint">
        {{ t("toolbar.imageAspectHint") }}
      </p>
      <button
        type="button"
        class="preview-toolbar__size-reset"
        @click="resetSize"
      >
        {{ t("toolbar.imageSizeReset") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
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

.preview-toolbar__aspect-label,
.preview-toolbar__aspect-hint,
.preview-toolbar__aspect-error {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.preview-toolbar__aspect-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preview-toolbar__aspect-preset {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.preview-toolbar__aspect-preset.is-active {
  border-color: var(--accent, #8250df);
  color: var(--text);
}

.preview-toolbar__aspect-custom {
  display: grid;
  grid-template-columns: 1fr 80px;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.preview-toolbar__aspect-custom input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.78rem;
}

.preview-toolbar__aspect-error {
  color: var(--danger, #cf222e);
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
</style>
