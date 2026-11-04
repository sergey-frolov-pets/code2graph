import { describe, expect, it } from "vitest";
import { layoutWizardTagCloud } from "@/constants/wizard-tag-cloud-layout";

const CLOUD_WIDTH_PX = 640;

describe("wizard tag cloud layout", () => {
  it("puts the largest tag nearer the center than the smallest", () => {
    const layout = layoutWizardTagCloud(
      [
        { key: "large", fontSizePx: 28, textLength: 8 },
        { key: "medium", fontSizePx: 20, textLength: 10 },
        { key: "small-a", fontSizePx: 13, textLength: 6 },
        { key: "small-b", fontSizePx: 13, textLength: 7 },
        { key: "small-c", fontSizePx: 14, textLength: 9 },
        { key: "small-d", fontSizePx: 15, textLength: 5 },
        { key: "small-e", fontSizePx: 16, textLength: 8 },
        { key: "small-f", fontSizePx: 13, textLength: 11 },
      ],
      CLOUD_WIDTH_PX,
    );

    const centerX = layout.widthPx / 2;
    const centerY = layout.heightPx / 2;
    const distance = (key: string) => {
      const tag = layout.placements.find((item) => item.key === key);
      expect(tag).toBeTruthy();
      const x = tag!.leftPx + tag!.widthPx / 2;
      const y = tag!.topPx + tag!.heightPx / 2;
      return Math.hypot(x - centerX, y - centerY);
    };

    expect(distance("large")).toBeLessThan(distance("small-a"));
    expect(distance("large")).toBeLessThan(distance("small-f"));
  });

  it("keeps every tag inside the rectangle and spans its width", () => {
    const layout = layoutWizardTagCloud(
      [
        { key: "large", fontSizePx: 28, textLength: 12 },
        { key: "mid", fontSizePx: 18, textLength: 8 },
        { key: "small", fontSizePx: 13, textLength: 4 },
      ],
      CLOUD_WIDTH_PX,
    );

    expect(layout.heightPx).toBeGreaterThan(0);
    for (const tag of layout.placements) {
      expect(tag.leftPx).toBeGreaterThanOrEqual(0);
      expect(tag.topPx).toBeGreaterThanOrEqual(0);
      expect(tag.leftPx + tag.widthPx).toBeLessThanOrEqual(layout.widthPx + 1);
      expect(tag.topPx + tag.heightPx).toBeLessThanOrEqual(layout.heightPx);
    }

    const left = Math.min(...layout.placements.map((tag) => tag.leftPx));
    const right = Math.max(...layout.placements.map((tag) => tag.leftPx + tag.widthPx));
    expect(left).toBeLessThan(CLOUD_WIDTH_PX * 0.2);
    expect(right).toBeGreaterThan(CLOUD_WIDTH_PX * 0.8);
  });
});
