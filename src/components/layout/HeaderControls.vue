<script setup lang="ts">
import { computed } from "vue";
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useLocale } from "@/composables/useLocale";
import { useUiTheme } from "@/composables/useUiTheme";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/constants/i18n";

const { locale, setLocale, t } = useLocale();
const { uiDarkMode, toggleUiTheme } = useUiTheme();

const themeToggleLabel = computed(() =>
  uiDarkMode.value ? t("header.themeToLight") : t("header.themeToDark"),
);

function onLocaleChange(event: Event): void {
  setLocale((event.target as HTMLSelectElement).value as AppLocale);
}
</script>

<template>
  <div class="header-controls">
    <label class="header-controls__locale">
      <span class="sr-only">{{ t("header.language") }}</span>
      <select
        class="header-controls__locale-select select"
        :value="locale"
        :aria-label="t('header.language')"
        @change="onLocaleChange"
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

    <IconButton
      :label="themeToggleLabel"
      :pressed="uiDarkMode"
      extra-class="header-controls__theme-btn"
      @click="toggleUiTheme"
    >
      <ActionIcon :name="uiDarkMode ? 'sun' : 'moon'" />
    </IconButton>
  </div>
</template>

<style scoped>
.header-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-controls__locale-select {
  min-width: 0;
  max-width: 120px;
  height: 36px;
  padding: 0 28px 0 10px;
  font-size: 0.85rem;
}

.header-controls__theme-btn {
  width: 36px;
  min-width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
}
</style>
