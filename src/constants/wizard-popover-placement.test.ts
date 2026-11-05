import { describe, expect, it } from "vitest";
import { placeWizardPopover } from "@/constants/wizard-popover-placement";

const BOUNDS = { top: 0, left: 0, right: 400, bottom: 500 };

describe("placeWizardPopover", () => {
  it("opens a short card under the example and keeps it inside the wizard", () => {
    const placed = placeWizardPopover({
      anchor: { top: 100, left: 20, right: 180, bottom: 220, width: 160 },
      bounds: BOUNDS,
      panelHeight: 80,
    });

    expect(placed).toEqual({
      top: 192,
      left: 20,
      width: 160,
      maxHeight: 300,
    });
    expect(placed.top + 80).toBeLessThanOrEqual(BOUNDS.bottom - 8);
  });

  it("opens above the example when the card would cross the bottom edge", () => {
    const placed = placeWizardPopover({
      anchor: { top: 400, left: 20, right: 180, bottom: 470, width: 160 },
      bounds: BOUNDS,
      panelHeight: 200,
    });

    expect(placed.top).toBe(228);
    expect(placed.maxHeight).toBe(200);
    expect(placed.top + placed.maxHeight).toBeLessThanOrEqual(BOUNDS.bottom - 8);
    expect(placed.top).toBeGreaterThanOrEqual(8);
  });

  it("limits a card that is taller than the wizard so the window does not clip it", () => {
    const bounds = { top: 0, left: 0, right: 400, bottom: 300 };
    const placed = placeWizardPopover({
      anchor: { top: 40, left: 16, right: 176, bottom: 120, width: 160 },
      bounds,
      panelHeight: 1000,
    });

    expect(placed.top).toBeGreaterThanOrEqual(8);
    expect(placed.top + placed.maxHeight).toBeLessThanOrEqual(bounds.bottom - 8);
    expect(placed.maxHeight).toBeLessThan(1000);
  });

  it("shifts a card that would stick out of the right edge", () => {
    const placed = placeWizardPopover({
      anchor: { top: 40, left: 350, right: 510, bottom: 120, width: 160 },
      bounds: BOUNDS,
      panelHeight: 40,
    });

    expect(placed.left + placed.width).toBeLessThanOrEqual(BOUNDS.right - 8);
    expect(placed.left).toBeGreaterThanOrEqual(8);
  });
});
