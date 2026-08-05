export const STORAGE_KEY_EDITOR_FONT_SIZE = "plantuml-smetana-editor-font-size";
export const STORAGE_KEY_EDITOR_FONT_FAMILY = "plantuml-smetana-editor-font-family";
export const STORAGE_KEY_EDITOR_SYNTAX_HIGHLIGHT =
  "plantuml-smetana-editor-syntax-highlight";
export const STORAGE_KEY_EDITOR_AUTOCOMPLETE =
  "plantuml-smetana-editor-autocomplete";
export const STORAGE_KEY_PREVIEW_BG = "plantuml-smetana-preview-bg";

export const DEFAULT_PREVIEW_BG = {
  light: "#ffffff",
  dark: "#171d24",
} as const;

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
export const DEFAULT_EDITOR_AUTOCOMPLETE = true;

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
