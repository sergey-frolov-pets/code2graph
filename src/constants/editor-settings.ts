export const STORAGE_KEY_EDITOR_FONT_SIZE = "code2graph-editor-font-size";
export const STORAGE_KEY_EDITOR_FONT_FAMILY = "code2graph-editor-font-family";
export const STORAGE_KEY_EDITOR_SYNTAX_HIGHLIGHT =
  "code2graph-editor-syntax-highlight";
export const STORAGE_KEY_EDITOR_AUTOCOMPLETE =
  "code2graph-editor-autocomplete";
export const STORAGE_KEY_PREVIEW_BG = "code2graph-preview-bg";
export const STORAGE_KEY_DIAGRAM_TEXT_COLOR = "code2graph-diagram-text-color";
export const STORAGE_KEY_DIAGRAM_FONT_FAMILY = "code2graph-diagram-font-family";
export const STORAGE_KEY_DIAGRAM_FONT_WEIGHT = "code2graph-diagram-font-weight";
export const STORAGE_KEY_DIAGRAM_FONT_STYLE = "code2graph-diagram-font-style";

/** Шрифт диаграммы по умолчанию: id из `DIAGRAM_FONT_FAMILIES`. */
export const DEFAULT_DIAGRAM_FONT_FAMILY = "sans";
export const DEFAULT_DIAGRAM_FONT_WEIGHT = "400";
export const DEFAULT_DIAGRAM_FONT_STYLE = "normal";

export const DEFAULT_PREVIEW_BG = {
  light: "#ffffff",
  dark: "#171d24",
} as const;

/**
 * «Прозрачный» фон предпросмотра. Хранится как строка, а не как цвет:
 * <input type="color"> такого значения не знает, поэтому тулбар держит
 * отдельную кнопку-переключатель, а фон панели рисуется шахматкой.
 */
export const TRANSPARENT_PREVIEW_BG = "transparent";

export function isTransparentPreviewBg(value: string): boolean {
  return value.trim().toLowerCase() === TRANSPARENT_PREVIEW_BG;
}

/**
 * Преднастроенные фоны предпросмотра — кнопки-образцы в тулбаре.
 * `id` — ключ локализации `toolbar.previewBackgroundPreset.<id>`.
 * Прозрачный фон в список не входит: он отдельной кнопкой, чтобы случайно
 * не включиться при выборе цвета.
 */
export const PREVIEW_BG_PRESETS = [
  { id: "light", value: "#ffffff" },
  { id: "dark", value: "#171d24" },
  { id: "paper", value: "#f6f1e7" },
  { id: "mint", value: "#e8f5ec" },
] as const;

export type PreviewBgPresetId = (typeof PREVIEW_BG_PRESETS)[number]["id"];

export const EDITOR_FONT_SIZE_OPTIONS = [
  { label: "12 px", value: "12px" },
  { label: "14 px", value: "14px" },
  { label: "16 px", value: "16px" },
  { label: "18 px", value: "18px" },
  { label: "20 px", value: "20px" },
] as const;

export type EditorFontSize =
  (typeof EDITOR_FONT_SIZE_OPTIONS)[number]["value"];

export const EDITOR_FONT_FAMILY_OPTIONS = [
  {
    id: "system",
    label: "Системный моноширинный",
    stack: '"SFMono-Regular", "Consolas", "Liberation Mono", monospace',
  },
  {
    id: "consolas",
    label: "Consolas",
    stack: '"Consolas", "Liberation Mono", monospace',
  },
  {
    id: "courier",
    label: "Courier New",
    stack: '"Courier New", Courier, monospace',
  },
  {
    id: "ubuntu",
    label: "Ubuntu Mono",
    stack: '"Ubuntu Mono", "Liberation Mono", monospace',
  },
  {
    id: "fira",
    label: "Fira Code",
    stack: '"Fira Code", "Consolas", monospace',
  },
] as const;

export type EditorFontFamilyId =
  (typeof EDITOR_FONT_FAMILY_OPTIONS)[number]["id"];

export const DEFAULT_EDITOR_FONT_SIZE: EditorFontSize = "14px";
export const DEFAULT_EDITOR_FONT_FAMILY_ID: EditorFontFamilyId = "system";
export const DEFAULT_EDITOR_SYNTAX_HIGHLIGHT = true;

/** Debounce delay before recomputing syntax highlight HTML in the editor. */
export const EDITOR_HIGHLIGHT_DEBOUNCE_MS = 50;

/** Width of one Tab stop in the code editor. Exposed as --editor-tab-size. */
export const EDITOR_TAB_SIZE = 2;

/** Enable content-visibility optimization when the document exceeds this line count. */
export const EDITOR_VIRTUAL_LINE_THRESHOLD = 200;
export const DEFAULT_EDITOR_AUTOCOMPLETE = true;

/**
 * Сравнение открытого файла со снимком сессии выключено.
 * Правка шла через проекцию diff: Enter и обычный ввод могли вставить
 * чужие строки вместо того, что набрал пользователь.
 * Undo/redo от этого флага не зависит.
 * Возврат — после починки проекции: https://github.com/sergey-frolov-pets/code2graph/issues/186
 */
export const SESSION_CHANGE_TRACKING_ENABLED = false;

export function resolveEditorFontFamily(id: EditorFontFamilyId): string {
  const option = EDITOR_FONT_FAMILY_OPTIONS.find((item) => item.id === id);
  return option?.stack ?? EDITOR_FONT_FAMILY_OPTIONS[0].stack;
}

export function isEditorFontSize(value: string): value is EditorFontSize {
  return EDITOR_FONT_SIZE_OPTIONS.some((option) => option.value === value);
}

export function isEditorFontFamilyId(value: string): value is EditorFontFamilyId {
  return EDITOR_FONT_FAMILY_OPTIONS.some((option) => option.id === value);
}
