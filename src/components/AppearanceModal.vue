<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppearanceFontSection from "@/components/AppearanceFontSection.vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import {
  DEFAULT_PREVIEW_BG,
  PREVIEW_BG_PRESETS,
  TRANSPARENT_PREVIEW_BG,
  isTransparentPreviewBg,
} from "@/constants/editor-settings";
import { contrastTextColor, isDarkColor } from "@/services/mermaid/ext/common";
import {
  isPreviewPresetActive,
  normalizePreviewHex,
  nudgePickerValue,
  resolveCustomPreviewBackground,
  shouldNudgeTransparentPicker,
} from "@/utils/preview-background-color";

const props = defineProps<{
  open: boolean;
  background: string;
  textColor: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
}>();

const emit = defineEmits<{
  close: [];
  "update:background": [value: string];
  "update:textColor": [value: string];
  "update:fontFamily": [value: string];
  "update:fontWeight": [value: string];
  "update:fontStyle": [value: string];
}>();

const { t } = useLocale();

const isTransparent = computed(() => isTransparentPreviewBg(props.background));

const autoTextColor = computed(() => {
  const base = isTransparent.value ? "#ffffff" : props.background;
  return contrastTextColor(base) ?? "#1f2328";
});

const isAutoText = ref(props.textColor === "");

const manualTextColor = computed(() =>
  props.textColor || autoTextColor.value,
);

const contrastRatio = computed(() => {
  const fg = manualTextColor.value;
  const bg = isTransparent.value ? "#ffffff" : props.background;
  const lum = (hex: string) => {
    const rgb = hex.replace("#", "");
    const full = rgb.length === 3 ? rgb.split("").map((c) => c + c).join("") : rgb;
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return (
      0.2126 * channel(parseInt(full.slice(0, 2), 16)) +
      0.7152 * channel(parseInt(full.slice(2, 4), 16)) +
      0.0722 * channel(parseInt(full.slice(4, 6), 16))
    );
  };
  const a = lum(fg);
  const b = lum(bg);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return Math.round(ratio * 10) / 10;
});

const contrastLevel = computed(() => {
  if (contrastRatio.value >= 7) return "aaa";
  if (contrastRatio.value >= 4.5) return "aa";
  return "low";
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) isAutoText.value = props.textColor === "";
  },
);

function setBackground(value: string): void {
  emit("update:background", value);
  if (isAutoText.value) emit("update:textColor", "");
}

/**
 * Цвет, на который сдвинули образец перед открытием пикера.
 * Пока он выбран, это ещё не решение пользователя — прозрачный фон не трогаем.
 */
const pickerNudge = ref<string | null>(null);

function pickerInput(event: Event): HTMLInputElement {
  return event.currentTarget as HTMLInputElement;
}

function shownPickerColor(): string {
  return isTransparent.value ? defaultBg.value : props.background;
}

function onCustomColorPointerDown(event: Event): void {
  const input = pickerInput(event);
  pickerNudge.value = null;
  if (!shouldNudgeTransparentPicker(input.value, isTransparent.value)) {
    return;
  }
  const nudged = nudgePickerValue(input.value);
  pickerNudge.value = nudged;
  input.value = nudged;
}

function isPickerNudge(value: string): boolean {
  const nudge = pickerNudge.value;
  if (!nudge) {
    return false;
  }
  return normalizePreviewHex(value) === normalizePreviewHex(nudge);
}

function restorePickerValue(input: HTMLInputElement): void {
  input.value = shownPickerColor();
  pickerNudge.value = null;
}

function commitCustomColor(value: string): boolean {
  if (isPickerNudge(value)) {
    return false;
  }
  pickerNudge.value = null;
  setBackground(resolveCustomPreviewBackground(value));
  return true;
}

function onCustomColorInput(event: Event): void {
  commitCustomColor(pickerInput(event).value);
}

function onCustomColorChange(event: Event): void {
  const input = pickerInput(event);
  if (!commitCustomColor(input.value)) {
    restorePickerValue(input);
  }
}

function onCustomColorBlur(event: Event): void {
  if (!pickerNudge.value) {
    return;
  }
  restorePickerValue(pickerInput(event));
}

function isPresetActive(value: string): boolean {
  return isPreviewPresetActive(props.background, value);
}

function onTextColorChange(value: string): void {
  isAutoText.value = false;
  emit("update:textColor", value);
}

function onTextInput(event: Event): void {
  onTextColorChange((event.target as HTMLInputElement).value);
}

function onAutoToggle(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  isAutoText.value = checked;
  emit("update:textColor", checked ? "" : autoTextColor.value);
}

const defaultBg = computed(() =>
  isDarkColor(props.background) ? DEFAULT_PREVIEW_BG.dark : DEFAULT_PREVIEW_BG.light,
);
</script>

<template>
  <AppModal
    :open="open"
    :title="t('appearance.title')"
    @close="emit('close')"
  >
    <div class="appearance">
      <section class="appearance__section">
        <h3 class="appearance__heading">
          {{ t("appearance.background") }}
        </h3>
        <div class="appearance__row">
          <label class="appearance__field">
            <span>{{ t("appearance.backgroundCustom") }}</span>
            <input
              class="appearance__color"
              type="color"
              :value="isTransparent ? defaultBg : background"
              @pointerdown="onCustomColorPointerDown"
              @input="onCustomColorInput"
              @change="onCustomColorChange"
              @blur="onCustomColorBlur"
            >
          </label>
          <button
            type="button"
            class="appearance__toggle"
            :class="{ 'is-active': isTransparent }"
            :aria-pressed="isTransparent"
            @click="setBackground(TRANSPARENT_PREVIEW_BG)"
          >
            {{ t("appearance.backgroundTransparent") }}
          </button>
        </div>
        <div class="appearance__presets">
          <button
            v-for="preset in PREVIEW_BG_PRESETS"
            :key="preset.id"
            type="button"
            class="appearance__preset"
            :class="{ 'is-active': isPresetActive(preset.value) }"
            :style="{ '--swatch-color': preset.value }"
            :aria-pressed="isPresetActive(preset.value)"
            @click="setBackground(preset.value)"
          >
            <span class="appearance__preset-dot" />
            {{ t(`toolbar.previewBackgroundPreset.${preset.id}`) }}
          </button>
        </div>
      </section>

      <section class="appearance__section">
        <h3 class="appearance__heading">
          {{ t("appearance.text") }}
        </h3>
        <div class="appearance__row">
          <label class="appearance__field">
            <span>{{ t("appearance.textColor") }}</span>
            <input
              class="appearance__color"
              type="color"
              :value="manualTextColor"
              :aria-label="t('appearance.textColor')"
              @input="onTextInput"
            >
          </label>
          <label class="appearance__check">
            <input
              type="checkbox"
              :checked="isAutoText"
              @change="onAutoToggle"
            >
            <span>{{ t("appearance.textAuto") }}</span>
          </label>
        </div>
        <p
          class="appearance__hint"
          :class="`is-${contrastLevel}`"
        >
          {{ t("appearance.contrast", { ratio: contrastRatio }) }}
          <template v-if="contrastLevel === 'low'">
            — {{ t("appearance.contrastLow") }}
          </template>
        </p>
      </section>

      <AppearanceFontSection
        :font-family="fontFamily"
        :font-weight="fontWeight"
        :font-style="fontStyle"
        :is-transparent="isTransparent"
        :background="background"
        :manual-text-color="manualTextColor"
        @update:font-family="emit('update:fontFamily', $event)"
        @update:font-weight="emit('update:fontWeight', $event)"
        @update:font-style="emit('update:fontStyle', $event)"
        @update:text-color="onTextColorChange"
      />
    </div>

    <template #footer>
      <button
        type="button"
        class="appearance__done"
        @click="emit('close')"
      >
        {{ t("appearance.done") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.appearance {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: min(420px, 78vw);
}

.appearance__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.appearance__heading {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.appearance__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}

.appearance__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.appearance__color {
  width: 64px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  cursor: pointer;
}

.appearance__check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text);
  cursor: pointer;
}

.appearance__toggle {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
}

.appearance__toggle.is-active {
  border-color: var(--accent, #8250df);
  color: var(--text);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent, #8250df) 30%, transparent);
}

.appearance__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.appearance__preset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.78rem;
  cursor: pointer;
}

.appearance__preset.is-active {
  border-color: var(--accent, #8250df);
  color: var(--text);
}

.appearance__preset-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgb(0 0 0 / 15%);
  background: var(--swatch-color);
}

.appearance__hint {
  margin: 0;
  font-size: 0.76rem;
  color: var(--text-muted);
}

.appearance__hint.is-low {
  color: #cf222e;
}

.appearance__done {
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 9px;
  background: var(--accent, #8250df);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
