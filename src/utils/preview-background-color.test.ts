import { describe, expect, it } from "vitest";
import { DEFAULT_PREVIEW_BG, PREVIEW_BG_PRESETS } from "@/constants/editor-settings";
import {
  PURE_BLACK_PREVIEW_BG,
  isPreviewPresetActive,
  normalizePreviewHex,
  nudgePickerValue,
  resolveCustomPreviewBackground,
  shouldNudgeTransparentPicker,
} from "@/utils/preview-background-color";

const lightPreset = PREVIEW_BG_PRESETS.find((preset) => preset.id === "light")!.value;
const darkPreset = PREVIEW_BG_PRESETS.find((preset) => preset.id === "dark")!.value;

describe("resolveCustomPreviewBackground", () => {
  it("белый включает пресет «Белый фон»", () => {
    expect(resolveCustomPreviewBackground("#ffffff")).toBe(lightPreset);
    expect(resolveCustomPreviewBackground("#FFFFFF")).toBe(lightPreset);
    expect(resolveCustomPreviewBackground("#fff")).toBe(lightPreset);
  });

  it("чёрный включает пресет «Тёмный фон»", () => {
    expect(resolveCustomPreviewBackground("#000000")).toBe(darkPreset);
    expect(resolveCustomPreviewBackground("#000")).toBe(darkPreset);
  });

  it("остальные цвета остаются своими", () => {
    expect(resolveCustomPreviewBackground("#123456")).toBe("#123456");
    expect(resolveCustomPreviewBackground(darkPreset)).toBe(darkPreset);
  });
});

describe("isPreviewPresetActive", () => {
  it("белый и чёрный подсвечивают свои пресеты, прозрачный — нет", () => {
    expect(isPreviewPresetActive("#ffffff", lightPreset)).toBe(true);
    expect(isPreviewPresetActive(PURE_BLACK_PREVIEW_BG, darkPreset)).toBe(true);
    expect(isPreviewPresetActive(PURE_BLACK_PREVIEW_BG, lightPreset)).toBe(false);
    expect(isPreviewPresetActive("transparent", lightPreset)).toBe(false);
    expect(isPreviewPresetActive("transparent", darkPreset)).toBe(false);
  });
});

describe("nudge прозрачного пикера", () => {
  it("сдвигает белый и чёрный, пока включена прозрачность", () => {
    expect(shouldNudgeTransparentPicker(DEFAULT_PREVIEW_BG.light, true)).toBe(true);
    expect(shouldNudgeTransparentPicker(PURE_BLACK_PREVIEW_BG, true)).toBe(true);
    expect(shouldNudgeTransparentPicker(DEFAULT_PREVIEW_BG.light, false)).toBe(false);
    expect(shouldNudgeTransparentPicker("#123456", true)).toBe(false);
  });

  it("соседний цвет отличается от исходного", () => {
    expect(nudgePickerValue("#ffffff")).toBe("#fffffe");
    expect(nudgePickerValue("#000000")).toBe("#000001");
    expect(normalizePreviewHex(nudgePickerValue("#ffffff"))).not.toBe("#ffffff");
  });
});
