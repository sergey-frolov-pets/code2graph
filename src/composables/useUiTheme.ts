import { ref, watch } from "vue";
import { STORAGE_KEY_UI_DARK } from "@/constants";
import { readStorageBoolean, writeStorageItem } from "@/core/safe-storage";

function readInitialUiDarkMode(): boolean {
  return (
    readStorageBoolean(STORAGE_KEY_UI_DARK) ??
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

const uiDarkMode = ref(readInitialUiDarkMode());

function applyUiThemeToDocument(): void {
  document.documentElement.dataset.theme = uiDarkMode.value ? "dark" : "light";
}

watch(
  uiDarkMode,
  (value) => {
    writeStorageItem(STORAGE_KEY_UI_DARK, String(value));
    applyUiThemeToDocument();
  },
  { immediate: true },
);

export function useUiTheme() {
  function toggleUiTheme(): void {
    uiDarkMode.value = !uiDarkMode.value;
  }

  return {
    uiDarkMode,
    toggleUiTheme,
  };
}
