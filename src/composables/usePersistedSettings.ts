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
  isTransparentPreviewBg,
  resolveEditorFontFamily,
  STORAGE_KEY_EDITOR_AUTOCOMPLETE,
  STORAGE_KEY_EDITOR_FONT_FAMILY,
  STORAGE_KEY_EDITOR_FONT_SIZE,
  STORAGE_KEY_EDITOR_SYNTAX_HIGHLIGHT,
  STORAGE_KEY_PREVIEW_BG,
  STORAGE_KEY_DIAGRAM_TEXT_COLOR,
  STORAGE_KEY_DIAGRAM_FONT_FAMILY,
  STORAGE_KEY_DIAGRAM_FONT_WEIGHT,
  STORAGE_KEY_DIAGRAM_FONT_STYLE,
  DEFAULT_DIAGRAM_FONT_FAMILY,
  DEFAULT_DIAGRAM_FONT_WEIGHT,
  DEFAULT_DIAGRAM_FONT_STYLE,
  type EditorFontFamilyId,
  type EditorFontSize,
} from "@/constants/editor-settings";
import { useLocale } from "@/composables/useLocale";
import { useUiTheme } from "@/composables/useUiTheme";
import {
  readStorageBoolean,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/core/safe-storage";
import { migrateDeprecatedActivityColorSyntax } from "@/utils/plantuml-source";
import { toOpaqueColor } from "@/utils/export";

function readInitialRenderMode(): RenderMode {
  // Режим «всегда онлайн» больше не настройка: старый ключ не должен
  // снова отправлять исходник при каждой перерисовке.
  removeStorageItem(STORAGE_KEY_RENDER_MODE);
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
  // Цвет текста: пустая строка — «авто», подбирается под фон диаграммы.
  const diagramTextColor = ref(readStorageItem(STORAGE_KEY_DIAGRAM_TEXT_COLOR) ?? "");
  const diagramFontFamily = ref(
    readStorageItem(STORAGE_KEY_DIAGRAM_FONT_FAMILY) || DEFAULT_DIAGRAM_FONT_FAMILY,
  );
  const diagramFontWeight = ref(
    readStorageItem(STORAGE_KEY_DIAGRAM_FONT_WEIGHT) || DEFAULT_DIAGRAM_FONT_WEIGHT,
  );
  const diagramFontStyle = ref(
    readStorageItem(STORAGE_KEY_DIAGRAM_FONT_STYLE) || DEFAULT_DIAGRAM_FONT_STYLE,
  );

  const editorFontFamily = computed(() =>
    resolveEditorFontFamily(editorFontFamilyId.value),
  );

  function persistSettings(): void {
    writeStorageItem(STORAGE_KEY_SOURCE, source.value);
    writeStorageItem(STORAGE_KEY_UI_DARK, String(uiDarkMode.value));
    writeStorageItem(STORAGE_KEY_DIAGRAM_DARK, String(diagramDarkMode.value));
    writeStorageItem(STORAGE_KEY_LAYOUT, layout.value);
    removeStorageItem(STORAGE_KEY_RENDER_MODE);
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
    writeStorageItem(STORAGE_KEY_DIAGRAM_TEXT_COLOR, diagramTextColor.value);
    writeStorageItem(STORAGE_KEY_DIAGRAM_FONT_FAMILY, diagramFontFamily.value);
    writeStorageItem(STORAGE_KEY_DIAGRAM_FONT_WEIGHT, diagramFontWeight.value);
    writeStorageItem(STORAGE_KEY_DIAGRAM_FONT_STYLE, diagramFontStyle.value);
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
    removeStorageItem(STORAGE_KEY_RENDER_MODE);

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

    renderMode.value = DEFAULT_RENDER_MODE;
    applyLocaleToStoredSource();
  }

  function applyPreviewBackgroundToDocument(): void {
    // Любой выбранный цвет — НЕПРОЗРАЧНАЯ заливка. Прозрачность есть только
    // у отдельного режима «прозрачный фон»; любое другое значение (в т.ч.
    // rgba с альфой, прилетевшее из настроек/кастомного пикера) приводим
    // к сплошному цвету, иначе под ним просвечивает шахматка.
    const raw = previewBackground.value;
    const value = isTransparentPreviewBg(raw) ? raw : toOpaqueColor(raw);
    document.documentElement.style.setProperty("--preview-bg", value);
    // Нормализуем и само состояние: иначе в настройках остаётся rgba-строка
    // с альфой, и всё, что читает previewBackground напрямую, снова получает
    // полупрозрачный фон.
    if (value !== raw) {
      previewBackground.value = value;
    }
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
    ],
    () => {
      persistSettings();
    },
  );

  watch(renderMode, (mode) => {
    if (mode !== DEFAULT_RENDER_MODE) {
      renderMode.value = DEFAULT_RENDER_MODE;
    }
  });

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
    diagramTextColor,
    diagramFontFamily,
    diagramFontWeight,
    diagramFontStyle,
    editorFontFamily,
    persistSettings,
    restoreSettings,
    applyLocaleToStoredSource,
  };
}
