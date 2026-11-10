import { describe, expect, it } from "vitest";
import {
  overlayColorOpacity,
  overlayColorWithOpacity,
  overlayCssColor,
  PRESENTATION_TRANSPARENT_COLOR,
  readOverlayPaint,
} from "@/services/presentation/overlay-color";

describe("overlay paint colors", () => {
  it("keeps a transparent color and a custom color with opacity", () => {
    expect(readOverlayPaint("transparent")).toBe(PRESENTATION_TRANSPARENT_COLOR);
    expect(readOverlayPaint("#0F6CBD")).toBe("#0f6cbd");
    expect(readOverlayPaint("#0f6cbd80")).toBe("#0f6cbd80");
    expect(readOverlayPaint("red")).toBe("");
    expect(overlayColorWithOpacity("#0f6cbd", 0)).toBe(PRESENTATION_TRANSPARENT_COLOR);
    expect(overlayColorWithOpacity("#0f6cbd", 1)).toBe("#0f6cbd");
    expect(overlayColorOpacity("#0f6cbd80")).toBeCloseTo(128 / 255);
    expect(overlayCssColor("", "var(--accent)")).toBe("var(--accent)");
    expect(overlayCssColor(PRESENTATION_TRANSPARENT_COLOR, "var(--accent)")).toBe(
      PRESENTATION_TRANSPARENT_COLOR,
    );
  });
});
