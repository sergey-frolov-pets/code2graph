<script setup lang="ts">
import { ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { APP_LINKS, LAYOUT_ENGINES, type LayoutEngine } from "@/constants";
import {
  EDITOR_FONT_FAMILY_OPTIONS,
  EDITOR_FONT_SIZE_OPTIONS,
  type EditorFontFamilyId,
  type EditorFontSize,
} from "@/constants/editor-settings";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/constants/i18n";
import { useLocale } from "@/composables/useLocale";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";

defineProps<{
  open: boolean;
  layout: LayoutEngine;
  darkMode: boolean;
  editorFontSize: EditorFontSize;
  editorFontFamilyId: EditorFontFamilyId;
}>();

const emit = defineEmits<{
  close: [];
  "update:layout": [value: LayoutEngine];
  "update:darkMode": [value: boolean];
  "update:editorFontSize": [value: EditorFontSize];
  "update:editorFontFamilyId": [value: EditorFontFamilyId];
  openAbout: [];
}>();

const { locale, setLocale, t } = useLocale();
const { libraryApiUrl, setLibraryApiUrl } = useLibraryApiUrl();

const libraryServerInput = ref(libraryApiUrl.value);

watch(libraryApiUrl, (value) => {
  libraryServerInput.value = value;
});

function onLibraryServerBlur(): void {
  setLibraryApiUrl(libraryServerInput.value);
}

const layoutOptions = Object.entries(LAYOUT_ENGINES).map(([label, value]) => ({
  label,
  value,
}));
</script>

<template>
  <AppModal :open="open" :title="t('settings.title')" @close="emit('close')">
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
            v-for="option in EDITOR_FONT_FAMILY_OPTIONS"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>
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
      <h3 class="settings-section__title">{{ t("settings.theme") }}</h3>

      <label class="settings-field settings-field--checkbox">
        <input
          type="checkbox"
          :checked="darkMode"
          @change="
            emit(
              'update:darkMode',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span>{{ t("settings.darkTheme") }}</span>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.language") }}</h3>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.language") }}</span>
        <select
          class="select"
          :value="locale"
          @change="
            setLocale(($event.target as HTMLSelectElement).value as AppLocale)
          "
        >
          <option
            v-for="supportedLocale in SUPPORTED_LOCALES"
            :key="supportedLocale"
            :value="supportedLocale"
          >
            {{ LOCALE_LABELS[supportedLocale] }}
          </option>
        </select>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.library") }}</h3>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.libraryServer") }}</span>
        <input
          v-model="libraryServerInput"
          class="select"
          type="url"
          inputmode="url"
          autocomplete="off"
          :placeholder="t('settings.libraryServerPlaceholder')"
          @blur="onLibraryServerBlur"
          @keydown.enter="onLibraryServerBlur"
        />
        <span class="settings-field__hint">{{ t("settings.libraryServerHint") }}</span>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.help") }}</h3>
      <div class="settings-links">
        <a
          class="btn settings-link-btn"
          :href="APP_LINKS.plantumlGuide"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t("settings.plantumlGuide") }}
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

    <template #footer>
      <button class="btn btn-primary" type="button" @click="emit('close')">
        {{ t("app.done") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.settings-section + .settings-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.settings-section__title {
  margin: 0 0 12px;
  font-size: 0.92rem;
  font-weight: 600;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.settings-field__label {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.settings-field__hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.35;
}

.settings-field--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  color: var(--text);
}

.settings-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-link-btn {
  width: 100%;
  justify-content: flex-start;
  text-decoration: none;
  color: var(--text);
}
</style>
