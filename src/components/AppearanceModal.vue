<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import {
  DEFAULT_PREVIEW_BG,
  PREVIEW_BG_PRESETS,
  TRANSPARENT_PREVIEW_BG,
  isTransparentPreviewBg,
} from "@/constants/editor-settings";
import { contrastTextColor, isDarkColor } from "@/services/mermaid/ext/common";

/**
 * Окно оформления диаграммы: фон, цвет текста, шрифт и его стиль.
 *
 * Фон и текст живут здесь, а не в тулбаре: на панели осталась одна кнопка,
 * открывающая это окно. Цвет текста по умолчанию следует за фоном (автоконтраст),
 * но его можно задать вручную — тогда автоподбор отключается.
 */
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

/** Шрифты диаграммы: пары «id → CSS-стек», id же уходит в директиву `fontfamily`. */
const FONT_OPTIONS = [
  { id: "sans", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" },
  { id: "serif", stack: "Georgia, 'Times New Roman', 'PT Serif', serif" },
  { id: "mono", stack: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" },
  { id: "rounded", stack: "'Nunito', 'Segoe UI', system-ui, sans-serif" },
] as const;

const WEIGHT_OPTIONS = [
  { id: "normal", value: "400" },
  { id: "medium", value: "500" },
  { id: "semibold", value: "600" },
  { id: "bold", value: "700" },
] as const;

const isTransparent = computed(() => isTransparentPreviewBg(props.background));

/** Фон, который реально видно: у прозрачного берём плашку текущей темы. */
const effectiveBackground = computed(() =>
  isTransparent.value ? props.background : props.background,
);

/** Автоцвет текста под текущий фон (тот же расчёт, что в рендере). */
const autoTextColor = computed(() => {
  const base = isTransparent.value ? "#ffffff" : props.background;
  return contrastTextColor(base) ?? "#1f2328";
});

const isAutoText = ref(props.textColor === "");

const manualTextColor = computed(() =>
  props.textColor || autoTextColor.value,
);

/** Контраст выбранной пары — чтобы было видно, читается ли текст. */
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

const previewStack = computed(
  () => FONT_OPTIONS.find((f) => f.id === props.fontFamily)?.stack ?? FONT_OPTIONS[0].stack,
);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) isAutoText.value = props.textColor === "";
  },
);

function setBackground(value: string): void {
  emit("update:background", value);
  // Автоцвет следует за фоном: после смены фона пересчитываем его заново.
  if (isAutoText.value) emit("update:textColor", "");
}

function onBackgroundInput(event: Event): void {
  setBackground((event.target as HTMLInputElement).value);
}

function onTextInput(event: Event): void {
  isAutoText.value = false;
  emit("update:textColor", (event.target as HTMLInputElement).value);
}

function onAutoToggle(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  isAutoText.value = checked;
  emit("update:textColor", checked ? "" : autoTextColor.value);
}

function onFontFamilyChange(event: Event): void {
  emit("update:fontFamily", (event.target as HTMLSelectElement).value);
}

function onWeightChange(event: Event): void {
  emit("update:fontWeight", (event.target as HTMLSelectElement).value);
}

function toggleItalic(): void {
  emit("update:fontStyle", props.fontStyle === "italic" ? "normal" : "italic");
}

const defaultBg = computed(() =>
  isDarkColor(effectiveBackground.value) ? DEFAULT_PREVIEW_BG.dark : DEFAULT_PREVIEW_BG.light,
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
              @input="onBackgroundInput"
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
            :class="{ 'is-active': !isTransparent && preset.value.toLowerCase() === background.toLowerCase() }"
            :style="{ '--swatch-color': preset.value }"
            :aria-pressed="!isTransparent && preset.value.toLowerCase() === background.toLowerCase()"
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

      <section class="appearance__section">
        <h3 class="appearance__heading">
          {{ t("appearance.font") }}
        </h3>
        <div class="appearance__row">
          <label class="appearance__field appearance__field--grow">
            <span>{{ t("appearance.fontFamily") }}</span>
            <select
              :value="fontFamily"
              @change="onFontFamilyChange"
            >
              <option
                v-for="font in FONT_OPTIONS"
                :key="font.id"
                :value="font.id"
              >
                {{ t(`appearance.fontFamilyId.${font.id}`) }}
              </option>
            </select>
          </label>
          <label class="appearance__field">
            <span>{{ t("appearance.fontWeight") }}</span>
            <select
              :value="fontWeight"
              @change="onWeightChange"
            >
              <option
                v-for="w in WEIGHT_OPTIONS"
                :key="w.id"
                :value="w.value"
              >
                {{ t(`appearance.fontWeightId.${w.id}`) }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="appearance__toggle appearance__toggle--italic"
            :class="{ 'is-active': fontStyle === 'italic' }"
            :aria-pressed="fontStyle === 'italic'"
            @click="toggleItalic"
          >
            {{ t("appearance.italic") }}
          </button>
        </div>
      </section>

      <section class="appearance__section">
        <h3 class="appearance__heading">
          {{ t("appearance.preview") }}
        </h3>
        <label
          class="appearance__sample"
          :class="{ 'is-transparent': isTransparent }"
          :style="{
            background: isTransparent ? undefined : background,
            color: manualTextColor,
            fontFamily: previewStack,
            fontWeight,
            fontStyle,
          }"
        >
          <span>{{ t("appearance.sampleText") }}</span>
          <input
            class="appearance__sample-input"
            type="color"
            :value="manualTextColor"
            :aria-label="t('appearance.textColor')"
            @input="onTextInput"
          >
        </label>
      </section>
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

.appearance__field--grow {
  flex: 1 1 180px;
}

.appearance__field select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.82rem;
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

.appearance__sample-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
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

.appearance__toggle--italic {
  font-style: italic;
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

.appearance__sample {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 1rem;
  text-align: center;
  cursor: pointer;
}

.appearance__sample.is-transparent {
  background-image:
    linear-gradient(45deg, var(--preview-checker) 25%, transparent 25%),
    linear-gradient(-45deg, var(--preview-checker) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--preview-checker) 75%),
    linear-gradient(-45deg, transparent 75%, var(--preview-checker) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
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
