import { describe, expect, it } from "vitest";
import { POINTER_HAND_GLYPH, PRESENTATION_MARK_GLYPHS } from "@/services/presentation/glyph-data";

describe("presentation artwork", () => {
  it("keeps the public-domain pointing hand and the sign colors", () => {
    expect(POINTER_HAND_GLYPH.parts[0]?.fill).toBe("#FFFFFF");
    expect(POINTER_HAND_GLYPH.parts[0]?.d.length).toBeGreaterThan(100);
    expect(POINTER_HAND_GLYPH.parts[1]?.stroke).toBe("#000000");
    expect(PRESENTATION_MARK_GLYPHS.warning.parts.some((part) => part.fill === "#FF0000")).toBe(true);
    expect(PRESENTATION_MARK_GLYPHS.stop.parts.some((part) => part.fill === "#d8261c")).toBe(true);
    expect(PRESENTATION_MARK_GLYPHS["flag-red"].parts.some((part) => part.fill === "#ff2a2a")).toBe(true);
    expect(PRESENTATION_MARK_GLYPHS["flag-green"].parts.some((part) => part.fill === "#66ff00")).toBe(true);
    expect(PRESENTATION_MARK_GLYPHS.check.parts.some((part) => part.fill === "#2ecc71")).toBe(true);
    expect(PRESENTATION_MARK_GLYPHS.cross.parts[0]?.fill).toBe("#d00000");
  });
});
