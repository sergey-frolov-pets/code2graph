// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { normalizeSvgPaintColors } from "@/services/export/svg-paint";
import { sanitizeSvgForPreview } from "@/utils/export";

const FOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
  <rect x="0" y="0" width="200" height="80" fill="#FFF3E0"/>
  <path d="M10,20 L80,20 L90,35 L180,35 L180,70 L10,70 Z" fill="#00000000" stroke="#000000"/>
  <path d="M140,10 L140,20 L120,30 L10,30" fill="#00000000" stroke="#181818"/>
  <rect x="20" y="40" width="40" height="16" fill="#F1F1F1"/>
</svg>`;

describe("normalizeSvgPaintColors", () => {
  it("turns PlantUML transparent black into no fill so folders stay outlines", () => {
    const result = normalizeSvgPaintColors(FOLDER_SVG);
    const doc = new DOMParser().parseFromString(result, "image/svg+xml");
    const paths = [...doc.querySelectorAll("path")];

    expect(paths).toHaveLength(2);
    expect(paths.every((path) => path.getAttribute("fill") === "none")).toBe(true);
    expect(doc.querySelector("rect[fill='#FFF3E0']") || doc.querySelector("rect[fill='#fff3e0']")).toBeTruthy();
    expect(result).not.toContain("#00000000");
  });

  it("keeps a real opaque color and splits partial alpha", () => {
    const result = normalizeSvgPaintColors(
      `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#E3F2FD80" stroke="#181818FF"/></svg>`,
    );
    const rect = new DOMParser().parseFromString(result, "image/svg+xml").querySelector("rect");

    expect(rect?.getAttribute("fill")?.toLowerCase()).toBe("#e3f2fd");
    expect(Number(rect?.getAttribute("fill-opacity"))).toBeCloseTo(128 / 255, 2);
    expect(rect?.getAttribute("stroke")?.toLowerCase()).toBe("#181818");
    expect(rect?.hasAttribute("stroke-opacity")).toBe(false);
  });

  it("preview sanitizer does not paint the component folder black", () => {
    const result = sanitizeSvgForPreview(FOLDER_SVG);
    expect(result).toContain('fill="none"');
    expect(result).not.toContain("#00000000");
    expect(result).toMatch(/#F1F1F1/i);
  });
});
