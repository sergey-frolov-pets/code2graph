// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import d2ClassesSvg from "@/assets/wizard-thumbnails/ru/d2-classes.svg?raw";
import d2FlowSvg from "@/assets/wizard-thumbnails/ru/d2-flow.svg?raw";
import { getWiremarkSampleSource } from "@/constants/wiremark-sample-diagrams";
import * as d2Engine from "@/services/d2/d2-engine";
import { renderWiremarkToSvg } from "@/services/wiremark/wiremark-engine";
import {
  applyPreviewBackground,
  isTransparentBackground,
  normalizeSvgRootSize,
  parseSvgCssSize,
  parseSvgSize,
  sanitizeSvgForPreview,
  withTransparentSvgBackground,
} from "@/utils/export";
import { renderDiagram } from "@/formats";

describe("parseSvgSize", () => {
  it("prefers viewBox over percentage width", () => {
    const size = parseSvgSize(
      '<svg width="100%" viewBox="0 0 1200 268" xmlns="http://www.w3.org/2000/svg"></svg>',
    );

    expect(size).toEqual({ width: 1200, height: 268 });
  });

  it("rounds fractional width and height to whole pixels", () => {
    expect(
      parseSvgSize(
        '<svg viewBox="0 0 812.4 433.6" xmlns="http://www.w3.org/2000/svg"></svg>',
      ),
    ).toEqual({ width: 812, height: 434 });

    expect(
      parseSvgSize(
        '<svg width="800.6" height="600.2" xmlns="http://www.w3.org/2000/svg"></svg>',
      ),
    ).toEqual({ width: 801, height: 600 });
  });
});

describe("parseSvgCssSize", () => {
  it("uses the css width and height even when the viewBox differs", () => {
    expect(
      parseSvgCssSize(
        '<svg width="1200" height="900" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"></svg>',
        { width: 1, height: 1 },
      ),
    ).toEqual({ width: 1200, height: 900 });
  });

  it("keeps a shifted viewBox from changing the element box", () => {
    expect(
      parseSvgCssSize(
        '<svg width="200" height="100" viewBox="-20 -10 200 100" xmlns="http://www.w3.org/2000/svg"></svg>',
        { width: 1, height: 1 },
      ),
    ).toEqual({ width: 200, height: 100 });
  });

  it("falls back to the viewBox when width is a percentage", () => {
    expect(
      parseSvgCssSize(
        '<svg width="100%" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"></svg>',
        { width: 10, height: 10 },
      ),
    ).toEqual({ width: 800, height: 600 });
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
    expect(result).not.toMatch(/<rect[^>]*\bfill="#ffffff"/i);
  });

  it("keeps the white rect that makes a D2 connection mask visible", () => {
    const result = sanitizeSvgForPreview(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><svg width="100" height="40" viewBox="-10 -10 100 40"><rect x="-10" y="-10" width="100" height="40" fill="#FFFFFF"/><path d="M0 0 L10 10" mask="url(#edge-mask)"/><mask id="edge-mask"><rect x="-10" y="-10" width="100" height="40" fill="white"/></mask></svg></svg>`,
    );

    expect(result).toMatch(/<mask[^>]*>\s*<rect[^>]*\bfill="white"/);
    expect(result).not.toMatch(/<mask[^>]*>\s*<rect[^>]*\bfill="none"/);
  });

  it("keeps D2 class and SQL table body fills while removing the outer canvas backdrop", () => {
    const result = sanitizeSvgForPreview(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 755" width="480" height="755"><svg class="d2-svg" width="480" height="755" viewBox="-41 -41 480 755"><rect x="-41" y="-41" width="480" height="755" fill="#FFFFFF"/><g><g class="shape"><rect x="61" y="0" width="276" height="322" stroke="#0A0F25" fill="#FFFFFF"/><rect x="61" y="0" width="276" height="92" fill="#0A0F25"/><text x="199" y="50.5" fill="#FFFFFF">Пользователь</text></g></g></svg></svg>`,
    );
    const doc = new DOMParser().parseFromString(result, "image/svg+xml");
    const rects = [...doc.querySelectorAll("rect")];

    expect(rects).toHaveLength(2);
    expect(rects[0]?.getAttribute("fill")).toBe("#FFFFFF");
    expect(rects[1]?.getAttribute("fill")).toBe("#0A0F25");
  });

  it("keeps WireMark frame paper and label chips while removing the outer canvas backdrop", () => {
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
    expect(doc.querySelector("svg > rect")).toBeNull();

    const framePaper = doc.querySelector("g[clip-path] > rect");
    expect(framePaper?.getAttribute("fill")?.toLowerCase()).toBe("#ffffff");
  });

  it("preserves D2 class header contrast and appendix badge fills when rendering on a light canvas", async () => {
    const spy = vi.spyOn(d2Engine, "renderD2ToSvg");
    try {
      spy.mockResolvedValueOnce(d2ClassesSvg);
      const classesSvg = await renderDiagram("d2", "User: { shape: class }", {
        layout: "smetana",
        diagramDarkMode: false,
        renderMode: "offline",
        diagramBackground: "#ffffff",
      });
      const classesDoc = new DOMParser().parseFromString(
        sanitizeSvgForPreview(classesSvg),
        "image/svg+xml",
      );
      const headerTitle = [...classesDoc.querySelectorAll("text")].find(
        (node) => node.textContent?.trim() === "Пользователь",
      );

      expect(headerTitle?.getAttribute("fill")?.toLowerCase()).toBe("#ffffff");
      expect(headerTitle?.getAttribute("style") ?? "").not.toContain("!important");

      spy.mockResolvedValueOnce(d2FlowSvg);
      const flowSvg = await renderDiagram("d2", "user -> api", {
        layout: "smetana",
        diagramDarkMode: false,
        renderMode: "offline",
        diagramBackground: "#ffffff",
      });
      const flowDoc = new DOMParser().parseFromString(
        sanitizeSvgForPreview(flowSvg),
        "image/svg+xml",
      );
      const badgeCircle = flowDoc.querySelector("g.appendix-icon path[fill]");

      expect(badgeCircle?.getAttribute("fill")?.toLowerCase()).toBe("white");
    } finally {
      spy.mockRestore();
    }
  });

  it("preserves WireMark dark palette and hatch strokes when rendering with a custom preview background", async () => {
    const settingsSvg = await renderDiagram(
      "wiremark",
      getWiremarkSampleSource("settings", "ru"),
      {
        layout: "smetana",
        diagramDarkMode: true,
        renderMode: "offline",
        diagramBackground: "#ffffff",
      },
    );
    const doc = new DOMParser().parseFromString(
      sanitizeSvgForPreview(settingsSvg),
      "image/svg+xml",
    );
    const title = [...doc.querySelectorAll("text")].find(
      (node) => node.textContent?.trim() === "Настройки",
    );
    const framePaper = doc.querySelector("g[clip-path] > rect");

    expect(title?.getAttribute("fill")?.toLowerCase()).toBe("#d4dde6");
    expect(framePaper?.getAttribute("fill")?.toLowerCase()).toBe("#1e2127");
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
    expect(doc.documentElement.getAttribute("style")).toContain("background-color:#fdf6e3");

    expect(doc.querySelector("rect[data-break-gap]")?.getAttribute("fill")).toBe("#fdf6e3");
    expect(doc.querySelector("rect[data-line-gap]")?.getAttribute("fill")).toBe("#fdf6e3");
  });

  it("прозрачный фон даёт белые вырезы, а не дыры в барах", () => {
    const out = applyPreviewBackground(svgWithGaps, "transparent");
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");

    expect(doc.querySelector("rect[data-break-gap]")?.getAttribute("fill")).toBe("#ffffff");
    expect(doc.querySelector("rect[data-line-gap]")?.getAttribute("fill")).toBe("#ffffff");
    expect(doc.documentElement.getAttribute("style")).toContain("background-color:transparent");
  });

  it("плашки чисел и подписи разрыва становятся прозрачными вместе с фоном", () => {
    const svg =
      '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0" y="0" width="200" height="100" fill="#ffffff"/>' +
      '<rect x="0" y="40" width="30" height="8" fill="#171d24" data-break-gap="1"/>' +
      '<rect x="4" y="20" width="28" height="22" fill="#171d24" data-break-text-bg="1"/>' +
      "</svg>";
    const out = applyPreviewBackground(svg, "transparent");
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");

    expect(doc.querySelector("rect[data-break-text-bg]")?.getAttribute("fill")).toBe("transparent");
    expect(doc.querySelector("rect[data-break-gap]")?.getAttribute("fill")).toBe("#ffffff");
  });

  it("сплошной фон красит и плашки подписи разрыва", () => {
    const svg =
      '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0" y="0" width="200" height="100" fill="#ffffff"/>' +
      '<rect x="4" y="20" width="28" height="22" fill="#171d24" data-break-text-bg="1"/>' +
      "</svg>";
    const out = applyPreviewBackground(svg, "#fdf6e3");
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");

    expect(doc.querySelector("rect[data-break-text-bg]")?.getAttribute("fill")).toBe("#fdf6e3");
  });

  it("восьмизначный hex фона становится сплошным цветом без альфы", () => {
    const out = applyPreviewBackground(svgWithGaps, "#00aa0080");
    const doc = new DOMParser().parseFromString(out, "image/svg+xml");

    expect(doc.querySelector("rect[data-bg='canvas']")?.getAttribute("fill")).toBe("#00aa00");
    expect(doc.documentElement.getAttribute("style")).toContain("background-color:#00aa00");
  });

  it("не ломается на пустой строке и мусоре", () => {
    expect(applyPreviewBackground("", "#ffffff")).toBe("");
    expect(applyPreviewBackground("not svg", "#ffffff")).toBe("not svg");
  });
});
