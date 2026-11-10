<script setup lang="ts">
import { computed } from "vue";
import { FORMAT_GUIDE_LINKS } from "@/constants/help-guides";
import { APP_LINKS, LAYOUT_ENGINES, type LayoutEngine } from "@/constants";
import { getLlmApiKeysGuideHref } from "@/constants/llm-settings";
import {
  EDITOR_FONT_FAMILY_OPTIONS,
  EDITOR_FONT_SIZE_OPTIONS,
  type EditorFontFamilyId,
  type EditorFontSize,
} from "@/constants/editor-settings";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  layout: LayoutEngine;
  editorFontSize: EditorFontSize;
  editorFontFamilyId: EditorFontFamilyId;
  editorSyntaxHighlight: boolean;
  editorAutocomplete: boolean;
}>();

const emit = defineEmits<{
  "update:layout": [value: LayoutEngine];
  "update:editorFontSize": [value: EditorFontSize];
  "update:editorFontFamilyId": [value: EditorFontFamilyId];
  "update:editorSyntaxHighlight": [value: boolean];
  "update:editorAutocomplete": [value: boolean];
  openAbout: [];
}>();

const { locale, t } = useLocale();

const layoutOptions = Object.entries(LAYOUT_ENGINES).map(([label, value]) => ({
  label,
  value,
}));

const fontFamilyOptions = computed(() =>
  EDITOR_FONT_FAMILY_OPTIONS.map((option) => ({
    ...option,
    label: option.id === "system" ? t("settings.fontSystem") : option.label,
  })),
);

const llmApiKeysGuideHref = computed(() => getLlmApiKeysGuideHref(locale.value));
</script>

<template>
  <div class="settings-tab-panel">
  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.editor") }}</h3>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("settings.fontSize") }}</span>
      <select
        class="select"
        :value="editorFontSize"
        @change="
          emit(
            'update:editorFontSize',
            ($event.target as HTMLSelectElement).value as EditorFontSize,
          )
        "
      >
        <option
          v-for="option in EDITOR_FONT_SIZE_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("settings.fontFamily") }}</span>
      <select
        class="select"
        :value="editorFontFamilyId"
        @change="
          emit(
            'update:editorFontFamilyId',
            ($event.target as HTMLSelectElement).value as EditorFontFamilyId,
          )
        "
      >
        <option
          v-for="option in fontFamilyOptions"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <label class="settings-field settings-field--checkbox">
      <input
        type="checkbox"
        :checked="editorSyntaxHighlight"
        @change="
          emit(
            'update:editorSyntaxHighlight',
            ($event.target as HTMLInputElement).checked,
          )
        "
      />
      <span>{{ t("settings.syntaxHighlight") }}</span>
    </label>

    <label class="settings-field settings-field--checkbox">
      <input
        type="checkbox"
        :checked="editorAutocomplete"
        @change="
          emit(
            'update:editorAutocomplete',
            ($event.target as HTMLInputElement).checked,
          )
        "
      />
      <span>{{ t("settings.autocomplete") }}</span>
    </label>
  </div>

  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.rendering") }}</h3>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("settings.layoutEngine") }}</span>
      <select
        class="select"
        :value="layout"
        @change="
          emit(
            'update:layout',
            ($event.target as HTMLSelectElement).value as LayoutEngine,
          )
        "
      >
        <option
          v-for="option in layoutOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>
  </div>

  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.help") }}</h3>
    <div class="settings-links">
      <a
        v-for="guide in FORMAT_GUIDE_LINKS"
        :key="guide.id"
        class="btn settings-link-btn"
        :href="guide.href"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ t(guide.labelKey) }}
      </a>
      <a
        class="btn settings-link-btn"
        :href="APP_LINKS.yEd"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ t("settings.yedEditor") }}
      </a>
      <a
        class="btn settings-link-btn"
        :href="llmApiKeysGuideHref"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ t("settings.llmKeysGuide") }}
      </a>
      <button
        class="btn settings-link-btn"
        type="button"
        @click="emit('openAbout')"
      >
        {{ t("settings.about") }}
      </button>
    </div>
  </div>
  </div>
</template>

<style src="./settings-modal.css"></style>
