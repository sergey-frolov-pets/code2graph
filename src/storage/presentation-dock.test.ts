import { describe, expect, it } from "vitest";
import {
  PRESENTATION_DOCK_MARGIN,
  PRESENTATION_DOCK_Z_INDEX,
  PRESENTATION_EFFECT_MENU_Z_INDEX,
  clampPresentationDockPosition,
} from "@/storage/presentation-dock";

describe("presentation dock position", () => {
  it("paints the effect menu above the dock", () => {
    expect(PRESENTATION_EFFECT_MENU_Z_INDEX).toBeGreaterThan(PRESENTATION_DOCK_Z_INDEX);
  });

  it("keeps the panel inside the window", () => {
    expect(clampPresentationDockPosition(
      { x: -40, y: -10 },
      200,
      120,
      800,
      600,
    )).toEqual({
      x: PRESENTATION_DOCK_MARGIN,
      y: PRESENTATION_DOCK_MARGIN,
    });

    expect(clampPresentationDockPosition(
      { x: 900, y: 700 },
      200,
      120,
      800,
      600,
    )).toEqual({
      x: 800 - 200 - PRESENTATION_DOCK_MARGIN,
      y: 600 - 120 - PRESENTATION_DOCK_MARGIN,
    });
  });

  it("pins a panel that is larger than the frame to the margin", () => {
    expect(clampPresentationDockPosition(
      { x: 40, y: 40 },
      900,
      700,
      800,
      600,
    )).toEqual({
      x: PRESENTATION_DOCK_MARGIN,
      y: PRESENTATION_DOCK_MARGIN,
    });
  });
});
