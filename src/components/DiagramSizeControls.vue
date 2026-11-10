<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import { useLocale } from "@/composables/useLocale";
import { wholeImagePixels } from "@/services/export/svg-geometry";

const props = defineProps<{
  imageWidth?: number;
  imageHeight?: number;
  imageSizeCustom?: boolean;
}>();

const emit = defineEmits<{
  setImageWidth: [value: number];
  setImageHeight: [value: number];
  resetImageSize: [];
}>();

const { t } = useLocale();

const MIN_DISPLAY_SIDE = 1;

const sizeMenuOpen = ref(false);
const sizeRef = ref<HTMLElement | null>(null);
const sizeButtonRef = ref<HTMLElement | null>(null);
const sizeMenuStyle = ref<Record<string, string>>({});

const displayWidth = computed(() => wholeSide(props.imageWidth));
const displayHeight = computed(() => wholeSide(props.imageHeight));

const imageSizeLabel = computed(() =>
  displayWidth.value && displayHeight.value
    ? `${displayWidth.value}×${displayHeight.value}`
    : "—",
);

function wholeSide(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return wholeImagePixels(value, MIN_DISPLAY_SIDE);
}

const imageSizeTitle = computed(() =>
  t("toolbar.imageSize", { size: imageSizeLabel.value }),
);

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
          :value="displayWidth"
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
          :value="displayHeight"
          @change="onSizeInput('height', $event)"
        >
      </label>
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
