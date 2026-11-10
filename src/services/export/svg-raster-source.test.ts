// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadSvgDocumentImage,
  svgRasterSourceUrl,
} from "@/services/export/svg-raster-source";

const SVG_RASTER_DATA_URL_PREFIX = "data:image/svg+xml;charset=utf-8,";

const MERMAID_LABEL_SVG = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40">`,
  `<foreignObject width="80" height="40">`,
  `<div xmlns="http://www.w3.org/1999/xhtml">Редактор</div>`,
  `</foreignObject>`,
  `<rect fill="#224466"/>`,
  `</svg>`,
].join("");

function svgFromRasterUrl(url: string): string {
  expect(url.startsWith(SVG_RASTER_DATA_URL_PREFIX)).toBe(true);
  return decodeURIComponent(url.slice(SVG_RASTER_DATA_URL_PREFIX.length));
}

describe("svgRasterSourceUrl", () => {
  it("keeps a Mermaid foreignObject label readable as a data URL", () => {
    const url = svgRasterSourceUrl(MERMAID_LABEL_SVG);

    expect(url.startsWith("blob:")).toBe(false);
    expect(url.includes("#")).toBe(false);
    expect(svgFromRasterUrl(url)).toBe(MERMAID_LABEL_SVG);
  });
});

describe("loadSvgDocumentImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the diagram from a data URL without a cross-origin request", async () => {
    const loaded: Array<{ src: string; crossOrigin: string | null }> = [];

    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin: string | null = null;
      private source = "";

      set src(value: string) {
        this.source = value;
        loaded.push({ src: value, crossOrigin: this.crossOrigin });
        this.onload?.();
      }

      get src(): string {
        return this.source;
      }
    }

    vi.stubGlobal("Image", FakeImage);

    const image = await loadSvgDocumentImage(MERMAID_LABEL_SVG);

    expect(image).toBeInstanceOf(FakeImage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.crossOrigin).toBeNull();
    expect(svgFromRasterUrl(loaded[0]?.src ?? "")).toBe(MERMAID_LABEL_SVG);
  });
});
