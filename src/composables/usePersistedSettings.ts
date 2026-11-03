import { computed, ref, watch } from "vue";
import {
  getDefaultSource,
  LAYOUT_ENGINES,
  STORAGE_KEY_DIAGRAM_DARK,
  STORAGE_KEY_LAYOUT,
  STORAGE_KEY_SOURCE,
  STORAGE_KEY_UI_DARK,
  translateSourceForLocale,
  type LayoutEngine,
} from "@/constants";
import {
  DEFAULT_RENDER_MODE,
  isRenderMode,
  STORAGE_KEY_RENDER_MODE,
  type RenderMode,
} from "@/constants/render-settings";
import {
  findAnySampleSelectionAnyLocale,
  getSampleSource,
  isDefaultSource,
} from "@/constants/sample-diagrams";
import {
  DEFAULT_EDITOR_AUTOCOMPLETE,
  DEFAULT_EDITOR_FONT_FAMILY_ID,
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_SYNTAX_HIGHLIGHT,
  DEFAULT_PREVIEW_BG,
  isEditorFontFamilyId,
  isEditorFontSize,
  resolveEditorFontFamily,
  STORAGE_KEY_EDITOR_AUTOCOMPLETE,
  STORAGE_KEY_EDITOR_FONT_FAMILY,
  STORAGE_KEY_EDITOR_FONT_SIZE,
  STORAGE_KEY_EDITOR_SYNTAX_HIGHLIGHT,
  STORAGE_KEY_PREVIEW_BG,
  type EditorFontFamilyId,
  type EditorFontSize,
} from "@/constants/editor-settings";
import { useLocale } from "@/composables/useLocale";
import { useUiTheme } from "@/composables/useUiTheme";
import {
  readStorageBoolean,
  readStorageItem,
  writeStorageItem,
} from "@/core/safe-storage";
import { migrateDeprecatedActivityColorSyntax } from "@/utils/plantuml-source";

function readInitialRenderMode(): RenderMode {
  const saved = readStorageItem(STORAGE_KEY_RENDER_MODE);
  if (saved && isRenderMode(saved)) {
    return saved;
  }

  return DEFAULT_RENDER_MODE;
}

function readInitialDiagramDarkMode(): boolean {
  return (
    readStorageBoolean(STORAGE_KEY_DIAGRAM_DARK) ??
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function readInitialEditorFontSize(): EditorFontSize {
  const saved = readStorageItem(STORAGE_KEY_EDITOR_FONT_SIZE);
  if (saved && isEditorFontSize(saved)) {
    return saved;
  }

  return DEFAULT_EDITOR_FONT_SIZE;
}

function readInitialEditorFontFamilyId(): EditorFontFamilyId {
  const saved = readStorageItem(STORAGE_KEY_EDITOR_FONT_FAMILY);
  if (saved && isEditorFontFamilyId(saved)) {
    return saved;
  }

  return DEFAULT_EDITOR_FONT_FAMILY_ID;
}

function readInitialEditorSyntaxHighlight(): boolean {
  return (
    readStorageBoolean(STORAGE_KEY_EDITOR_SYNTAX_HIGHLIGHT) ??
    DEFAULT_EDITOR_SYNTAX_HIGHLIGHT
  );
}

function readInitialEditorAutocomplete(): boolean {
  return (
    readStorageBoolean(STORAGE_KEY_EDITOR_AUTOCOMPLETE) ??
    DEFAULT_EDITOR_AUTOCOMPLETE
  );
}

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

function readInitialPreviewBackground(isDark: boolean): string {
  const saved = readStorageItem(STORAGE_KEY_PREVIEW_BG);
  if (saved) {
    const normalized = normalizeColor(saved);
    if (isDark && normalized === normalizeColor(DEFAULT_PREVIEW_BG.light)) {
      return DEFAULT_PREVIEW_BG.dark;
    }
    if (!isDark && normalized === normalizeColor(DEFAULT_PREVIEW_BG.dark)) {
      return DEFAULT_PREVIEW_BG.light;
    }
    return saved;
  }

  return isDark ? DEFAULT_PREVIEW_BG.dark : DEFAULT_PREVIEW_BG.light;
}

export function usePersistedSettings() {
  const { locale } = useLocale();
  const { uiDarkMode } = useUiTheme();

  const source = ref(getDefaultSource(locale.value));
  const layout = ref<LayoutEngine>(LAYOUT_ENGINES.smetana);
  const renderMode = ref<RenderMode>(readInitialRenderMode());
  const diagramDarkMode = ref(readInitialDiagramDarkMode());
  const editorFontSize = ref<EditorFontSize>(readInitialEditorFontSize());
  const editorFontFamilyId = ref<EditorFontFamilyId>(
    readInitialEditorFontFamilyId(),
  );
  const editorSyntaxHighlight = ref(readInitialEditorSyntaxHighlight());
  const editorAutocomplete = ref(readInitialEditorAutocomplete());
  const previewBackground = ref(
    readInitialPreviewBackground(diagramDarkMode.value),
  );

  const editorFontFamily = computed(() =>
    resolveEditorFontFamily(editorFontFamilyId.value),
  );

  function persistSettings(): void {
    writeStorageItem(STORAGE_KEY_SOURCE, source.value);
    writeStorageItem(STORAGE_KEY_UI_DARK, String(uiDarkMode.value));
    writeStorageItem(STORAGE_KEY_DIAGRAM_DARK, String(diagramDarkMode.value));
    writeStorageItem(STORAGE_KEY_LAYOUT, layout.value);
    writeStorageItem(STORAGE_KEY_RENDER_MODE, renderMode.value);
    writeStorageItem(STORAGE_KEY_EDITOR_FONT_SIZE, editorFontSize.value);
    writeStorageItem(STORAGE_KEY_EDITOR_FONT_FAMILY, editorFontFamilyId.value);
    writeStorageItem(
      STORAGE_KEY_EDITOR_SYNTAX_HIGHLIGHT,
      String(editorSyntaxHighlight.value),
    );
    writeStorageItem(
      STORAGE_KEY_EDITOR_AUTOCOMPLETE,
      String(editorAutocomplete.value),
    );
    writeStorageItem(STORAGE_KEY_PREVIEW_BG, previewBackground.value);
  }

  function applyLocaleToStoredSource(): void {
    if (isDefaultSource(source.value)) {
      source.value = getDefaultSource(locale.value);
      return;
    }

    const sampleSelection = findAnySampleSelectionAnyLocale(source.value);
    if (sampleSelection) {
      source.value = getSampleSource(sampleSelection, locale.value);
    }
  }

  function restoreSettings(): void {
    const savedSource = readStorageItem(STORAGE_KEY_SOURCE);
    const savedLayout = readStorageItem(STORAGE_KEY_LAYOUT);
    const savedRenderMode = readStorageItem(STORAGE_KEY_RENDER_MODE);

    if (savedSource) {
      const migrated = migrateDeprecatedActivityColorSyntax(savedSource);
      source.value = migrated;
      if (migrated !== savedSource) {
        writeStorageItem(STORAGE_KEY_SOURCE, migrated);
      }
    }

    if (savedLayout && savedLayout in LAYOUT_ENGINES) {
      layout.value = savedLayout as LayoutEngine;
    }

    if (savedRenderMode && isRenderMode(savedRenderMode)) {
      renderMode.value = savedRenderMode;
    }

    applyLocaleToStoredSource();
  }

  function applyPreviewBackgroundToDocument(): void {
    document.documentElement.style.setProperty(
      "--preview-bg",
      previewBackground.value,
    );
  }

  watch(previewBackground, applyPreviewBackgroundToDocument, { immediate: true });

  watch(
    diagramDarkMode,
    (isDark, wasDark) => {
      if (wasDark === undefined || wasDark === isDark) {
        return;
      }

      previewBackground.value = isDark
        ? DEFAULT_PREVIEW_BG.dark
        : DEFAULT_PREVIEW_BG.light;
    },
    { immediate: true },
  );

  watch(
    [
      editorFontSize,
      editorFontFamilyId,
      editorSyntaxHighlight,
      editorAutocomplete,
      previewBackground,
      uiDarkMode,
      renderMode,
    ],
    () => {
      persistSettings();
    },
  );

  watch(
    locale,
    (nextLocale, previousLocale) => {
      if (!previousLocale) {
        return;
      }

      const translated = translateSourceForLocale(
        source.value,
        previousLocale,
        nextLocale,
      );
      if (translated) {
        source.value = translated;
      }
    },
  );

  return {
    source,
    layout,
    renderMode,
    uiDarkMode,
    diagramDarkMode,
    editorFontSize,
    editorFontFamilyId,
    editorSyntaxHighlight,
    editorAutocomplete,
    previewBackground,
    editorFontFamily,
    persistSettings,
    restoreSettings,
    applyLocaleToStoredSource,
  };
}
