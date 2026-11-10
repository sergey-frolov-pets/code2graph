import { describe, expect, it } from "vitest";
import {
  PRESENTATION_OVERLAY_TEXT_HEIGHT_RATIO,
  PRESENTATION_OVERLAY_TEXT_LINE_HEIGHT,
  PRESENTATION_OVERLAY_TEXT_MAX_PX,
  PRESENTATION_OVERLAY_TEXT_MIN_PX,
} from "@/services/presentation/constants";
import {
  overlayTextFontSize,
  overlayTextLinePlacements,
} from "@/services/presentation/overlay-text";

describe("overlay note text", () => {
  it("keeps one line on the center of the note", () => {
    expect(overlayTextLinePlacements("Оплата прошла", 20)).toEqual([
      { text: "Оплата прошла", centerOffset: 0 },
    ]);
  });

  it("stacks lines from a note around the center", () => {
    const fontSize = 20;
    const lineHeight = fontSize * PRESENTATION_OVERLAY_TEXT_LINE_HEIGHT;
    expect(overlayTextLinePlacements("первая\nвторая\nтретья", fontSize)).toEqual([
      { text: "первая", centerOffset: -lineHeight },
      { text: "вторая", centerOffset: 0 },
      { text: "третья", centerOffset: lineHeight },
    ]);
  });

  it("keeps a blank line from a Windows newline", () => {
    const lines = overlayTextLinePlacements("сверху\r\n\r\nснизу", 16);
    expect(lines.map((line) => line.text)).toEqual(["сверху", "", "снизу"]);
    expect(lines[1]?.centerOffset).toBe(0);
  });

  it("clamps the note font between the minimum and maximum", () => {
    expect(overlayTextFontSize(0)).toBe(PRESENTATION_OVERLAY_TEXT_MIN_PX);
    expect(overlayTextFontSize(-4)).toBe(PRESENTATION_OVERLAY_TEXT_MIN_PX);
    expect(overlayTextFontSize(10_000)).toBe(PRESENTATION_OVERLAY_TEXT_MAX_PX);

    const height = 40;
    expect(overlayTextFontSize(height)).toBe(height * PRESENTATION_OVERLAY_TEXT_HEIGHT_RATIO);
  });
});
