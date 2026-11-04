<script setup lang="ts">
import { computed } from "vue";
import { useLocale } from "@/composables/useLocale";
import {
  DIAGRAM_FONT_FAMILIES,
  DIAGRAM_FONT_WEIGHTS,
} from "@/services/diagram-typography";

const props = defineProps<{
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  isTransparent: boolean;
  background: string;
  manualTextColor: string;
}>();

const emit = defineEmits<{
  "update:fontFamily": [value: string];
  "update:fontWeight": [value: string];
  "update:fontStyle": [value: string];
  "update:textColor": [value: string];
}>();

const { t } = useLocale();

const FONT_OPTIONS = DIAGRAM_FONT_FAMILIES;
const WEIGHT_OPTIONS = DIAGRAM_FONT_WEIGHTS;

const previewStack = computed(
  () => FONT_OPTIONS.find((f) => f.id === props.fontFamily)?.stack ?? FONT_OPTIONS[0].stack,
);

function onFontFamilyChange(event: Event): void {
  emit("update:fontFamily", (event.target as HTMLSelectElement).value);
}

function onWeightChange(event: Event): void {
  emit("update:fontWeight", (event.target as HTMLSelectElement).value);
}

function toggleItalic(): void {
  emit("update:fontStyle", props.fontStyle === "italic" ? "normal" : "italic");
}

function onSampleTextInput(event: Event): void {
  emit("update:textColor", (event.target as HTMLInputElement).value);
}
</script>

<template>
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
        @input="onSampleTextInput"
      >
    </label>
  </section>
</template>

<style scoped>
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
</style>
