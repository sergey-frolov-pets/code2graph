import {
  DEFAULT_PREVIEW_BG,
  PREVIEW_BG_PRESETS,
  type PreviewBgPresetId,
} from "@/constants/editor-settings";

/**
 * Чистый чёрный из `<input type="color">`.
 * В пикере это не отдельный пресет: такой выбор включает «Тёмный фон».
 */
export const PURE_BLACK_PREVIEW_BG = "#000000";

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/;
const SHORT_HEX_LENGTH = 3;
const CHANNEL_MAX = 255;
const CHANNEL_STEP = 1;
const BLUE_CHANNEL_INDEX = 5;
const CHANNEL_HEX_WIDTH = 2;

function presetValue(id: PreviewBgPresetId): string {
  const preset = PREVIEW_BG_PRESETS.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Missing preview background preset: ${id}`);
  }
  return preset.value;
}

/** `#rgb` / `#rrggbb` → нижний регистр `#rrggbb`. Иные строки — `null`. */
export function normalizePreviewHex(value: string): string | null {
  const match = HEX_COLOR_PATTERN.exec(value.trim().toLowerCase());
  if (!match) {
    return null;
  }

  const digits = match[1];
  if (digits.length === SHORT_HEX_LENGTH) {
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`;
  }
  return `#${digits}`;
}

/**
 * Цвет из «Свой цвет».
 * Белый включает пресет «Белый фон», чёрный — «Тёмный фон».
 * Прозрачный режим при этом выключается, потому что наружу уходит сплошной цвет.
 */
export function resolveCustomPreviewBackground(value: string): string {
  const hex = normalizePreviewHex(value);
  if (!hex) {
    return value;
  }
  if (hex === normalizePreviewHex(DEFAULT_PREVIEW_BG.light)) {
    return presetValue("light");
  }
  if (hex === PURE_BLACK_PREVIEW_BG) {
    return presetValue("dark");
  }
  return hex;
}

/** Активна ли кнопка пресета при текущем фоне (включая чёрный как тёмный). */
export function isPreviewPresetActive(background: string, presetColor: string): boolean {
  const current = normalizePreviewHex(background);
  const preset = normalizePreviewHex(presetColor);
  if (!current || !preset) {
    return false;
  }
  if (current === preset) {
    return true;
  }
  const dark = normalizePreviewHex(presetValue("dark"));
  return current === PURE_BLACK_PREVIEW_BG && preset === dark;
}

/**
 * Пока включён прозрачный фон, образец пикера уже равен белому, чёрному
 * или тёмному пресету. Повторный выбор того же цвета не шлёт `input`,
 * поэтому образец нужно чуть сдвинуть до открытия пикера.
 */
export function shouldNudgeTransparentPicker(shownColor: string, transparent: boolean): boolean {
  if (!transparent) {
    return false;
  }
  const hex = normalizePreviewHex(shownColor);
  if (!hex) {
    return false;
  }
  return (
    hex === normalizePreviewHex(DEFAULT_PREVIEW_BG.light) ||
    hex === PURE_BLACK_PREVIEW_BG ||
    hex === normalizePreviewHex(presetValue("dark"))
  );
}

/** Соседний цвет, чтобы выбор исходного белого или чёрного породил событие. */
export function nudgePickerValue(value: string): string {
  const hex = normalizePreviewHex(value);
  if (!hex) {
    return value;
  }
  const channel = Number.parseInt(hex.slice(BLUE_CHANNEL_INDEX, BLUE_CHANNEL_INDEX + CHANNEL_HEX_WIDTH), 16);
  const next = channel >= CHANNEL_MAX ? channel - CHANNEL_STEP : channel + CHANNEL_STEP;
  return `${hex.slice(0, BLUE_CHANNEL_INDEX)}${next.toString(16).padStart(CHANNEL_HEX_WIDTH, "0")}`;
}
