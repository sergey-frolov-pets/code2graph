// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getWiremarkSampleSource } from "@/constants/wiremark-sample-diagrams";
import { renderWiremarkToSvg } from "@/services/wiremark/wiremark-engine";
import {
  applyPreviewBackground,
  isTransparentBackground,
  normalizeSvgRootSize,
  parseSvgSize,
  sanitizeSvgForPreview,
  withTransparentSvgBackground,
} from "@/utils/export";

describe("parseSvgSize", () => {
  it("prefers viewBox over percentage width", () => {
    const size = parseSvgSize(
      '<svg width="100%" viewBox="0 0 1200 268" xmlns="http://www.w3.org/2000/svg"></svg>',
    );

    expect(size).toEqual({ width: 1200, height: 268 });
  });
});

describe("normalizeSvgRootSize", () => {
  it("materializes percentage width and missing height from viewBox", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      '<svg width="100%" viewBox="0 0 1200 268" style="max-width: 1200px;" xmlns="http://www.w3.org/2000/svg"></svg>',
      "image/svg+xml",
    );

    normalizeSvgRootSize(doc.documentElement);

    expect(doc.documentElement.getAttribute("width")).toBe("1200");
    expect(doc.documentElement.getAttribute("height")).toBe("268");
    expect(doc.documentElement.getAttribute("style") ?? "").not.toMatch(/max-width/i);
  });
});

describe("sanitizeSvgForPreview", () => {
  it("normalizes mermaid gantt-like percentage svg for preview layout", () => {
    const result = sanitizeSvgForPreview(
      '<svg id="mermaid-render-1" width="100%" viewBox="0 0 1200 268" style="max-width: 1200px;" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/></svg>',
    );

    expect(result).toMatch(/<svg[^>]*\bwidth="1200"/);
    expect(result).toMatch(/<svg[^>]*\bheight="268"/);
    expect(result).not.toMatch(/<svg[^>]*\bwidth="100%"/);
    expect(result).toMatch(/<rect[^>]*\bfill="none"/);
  });

  it("keeps the white rect that makes a D2 connection mask visible", () => {
    const result = sanitizeSvgForPreview(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><svg width="100" height="40" viewBox="-10 -10 100 40"><rect x="-10" y="-10" width="100" height="40" fill="#FFFFFF"/><path d="M0 0 L10 10" mask="url(#edge-mask)"/><mask id="edge-mask"><rect x="-10" y="-10" width="100" height="40" fill="white"/></mask></svg></svg>`,
    );

    expect(result).toMatch(/<mask[^>]*>\s*<rect[^>]*\bfill="white"/);
    expect(result).not.toMatch(/<mask[^>]*>\s*<rect[^>]*\bfill="none"/);
  });

  it("keeps the paper chip so a WireMark field outline does not cross its label", () => {
    const result = sanitizeSvgForPreview(
      renderWiremarkToSvg(getWiremarkSampleSource("form", "ru"), { dark: false }),
    );
    const doc = new DOMParser().parseFromString(result, "image/svg+xml");
    const label = [...doc.querySelectorAll("text")].find((node) =>
      node.textContent?.includes("Почта"),
    );
    const chip = label?.previousElementSibling;

    expect(chip?.tagName.toLowerCase()).toBe("rect");
    expect(chip?.getAttribute("fill")?.toLowerCase()).toBe("#ffffff");

    const frameFill = [...doc.querySelectorAll("rect")].find(
      (node) => Number.parseFloat(node.getAttribute("width") ?? "0") >= 300,
    );
    expect(frameFill?.getAttribute("fill")).toBe("none");
  });
});

describe("прозрачный фон экспорта", () => {
  const svgWithBackdrop =
    '<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="0" y="0" width="100" height="50" fill="#ffffff"/>' +
    '<rect x="10" y="10" width="20" height="20" fill="#ffffff"/>' +
    "</svg>";

  it("isTransparentBackground распознаёт transparent/none/пусто", () => {
    expect(isTransparentBackground("transparent")).toBe(true);
    expect(isTransparentBackground(" TRANSPARENT ")).toBe(true);
    expect(isTransparentBackground("none")).toBe(true);
    expect(isTransparentBackground("")).toBe(true);
    expect(isTransparentBackground(undefined)).toBe(true);
    expect(isTransparentBackground("#ffffff")).toBe(false);
    expect(isTransparentBackground("#171d24")).toBe(false);
  });

  it("withTransparentSvgBackground снимает плашку на весь холст, но не трогает содержимое", () => {
    const out = withTransparentSvgBackground(svgWithBackdrop);
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");
    const rects = Array.from(doc.querySelectorAll("rect"));

    expect(rects[0].getAttribute("fill")).toBe("none");
    expect(rects[1].getAttribute("fill")).toBe("#ffffff");
  });

  it("вырез под подпись не снимается вместе с плашкой холста", () => {
    const svg =
      '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0" y="0" width="200" height="100" fill="#ffffff"/>' +
      '<g transform="translate(10 10)">' +
      '<rect x="0" y="0" width="40" height="10" fill="#ffffff" data-break-gap="1"/>' +
      "</g></svg>";
    const out = withTransparentSvgBackground(svg);
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");

    expect(doc.querySelector("rect")?.getAttribute("fill")).toBe("none");
    expect(doc.querySelector("rect[data-break-gap]")?.getAttribute("fill")).toBe("#ffffff");
  });

  it("превью убирает плашку холста целиком (фон рисует панель)", () => {
    const out = sanitizeSvgForPreview(svgWithBackdrop);
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");
    // Плашки в разметке больше нет: `fill="none"` просвечивал шахматкой.
    expect(doc.querySelector("rect[data-bg='canvas']")).toBeNull();
  });
});

describe("applyPreviewBackground", () => {
  const svgWithGaps =
    '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="0" y="0" width="200" height="100" fill="#ffffff"/>' +
    '<g transform="translate(10 10)">' +
    '<rect x="0" y="0" width="40" height="10" fill="#171d24" data-break-gap="1"/>' +
    '<rect x="0" y="20" width="40" height="10" fill="#171d24" data-line-gap="1"/>' +
    "</g></svg>";

  it("вырезы и плашка получают выбранный цвет фона", () => {
    const out = applyPreviewBackground(svgWithGaps, "#fdf6e3");
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");

    expect(doc.querySelector("rect[data-bg='canvas']")?.getAttribute("fill")).toBe("#fdf6e3");

    expect(doc.querySelector("rect[data-break-gap]")?.getAttribute("fill")).toBe("#fdf6e3");
    expect(doc.querySelector("rect[data-line-gap]")?.getAttribute("fill")).toBe("#fdf6e3");
  });

  it("прозрачный фон даёт белые вырезы, а не дыры в барах", () => {
    const out = applyPreviewBackground(svgWithGaps, "transparent");
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");

    expect(doc.querySelector("rect[data-break-gap]")?.getAttribute("fill")).toBe("#ffffff");
    expect(doc.querySelector("rect[data-line-gap]")?.getAttribute("fill")).toBe("#ffffff");
  });

  it("не ломается на пустой строке и мусоре", () => {
    expect(applyPreviewBackground("", "#ffffff")).toBe("");
    expect(applyPreviewBackground("not svg", "#ffffff")).toBe("not svg");
  });
});
