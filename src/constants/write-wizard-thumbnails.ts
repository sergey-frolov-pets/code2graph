import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listDiagramExamples } from "@/constants/diagram-example-catalog";
import { getSampleSource } from "@/constants/sample-diagrams";
import { LAYOUT_ENGINES } from "@/constants";
import type { AppLocale } from "@/constants/i18n";
import { wizardThumbnailFileName } from "@/constants/wizard-gallery";
import { renderDiagramToSvg } from "@/services/diagram-render";
import { estimateDiagramTextWidth } from "@/services/plantuml/plantuml-measurement-font";
import type { PlantUmlApi } from "@/types/plantuml";
import { LocalizedAppError } from "@/utils/localized-app-error";

const LOCALES: readonly AppLocale[] = ["ru", "en"];
const THUMBNAIL_RENDER_TIMEOUT_MS = 45_000;
const SHIM_FONT_SIZE_PX = 14;
const SHIM_LINE_HEIGHT_EM = 1.2;

function shimFontSize(font: string): number {
  const size = Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? "");
  return Number.isFinite(size) && size > 0 ? size : SHIM_FONT_SIZE_PX;
}

function shimIsBold(font: string): boolean {
  return /\bbold\b|[6-9]00/.test(font);
}

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const thumbnailRoot = path.resolve(appRoot, "src/assets/wizard-thumbnails");

export function installJsdomDiagramShims(): void {
  if (typeof window === "undefined" || window.PlantUML?.renderToString) {
    return;
  }

  const textLength = (element: SVGElement): number => {
    if (element.localName === "text" || element.localName === "tspan") {
      const size = shimFontSize(element.getAttribute("font-size") ?? "");
      const width = estimateDiagramTextWidth(
        element.textContent ?? "",
        size,
        shimIsBold(element.getAttribute("font-weight") ?? ""),
      );
      return width > 0 ? width : 0;
    }
    return Math.max(8, (element.textContent ?? "").length * 8);
  };
  const svgPrototype = SVGElement.prototype as SVGElement & {
    getBBox: () => DOMRect;
  };
  svgPrototype.getBBox = function getBBox(this: SVGElement) {
    const width = textLength(this);
    const fontSize = shimFontSize(this.getAttribute("font-size") ?? "");
    const height = this.localName === "text" || this.localName === "tspan"
      ? fontSize * SHIM_LINE_HEIGHT_EM
      : 18;
    return {
      x: 0,
      y: -height * 0.8,
      width,
      height,
      top: -height * 0.8,
      right: width,
      bottom: height * 0.2,
      left: 0,
    } as DOMRect;
  };
  const computedTextLength = function computedTextLength(this: SVGElement) {
    return textLength(this);
  };
  Object.assign(SVGElement.prototype, { getComputedTextLength: computedTextLength });
  Object.assign(Element.prototype, { getComputedTextLength: computedTextLength });
  HTMLCanvasElement.prototype.getContext = (() => ({
    font: "",
    measureText(text: string) {
      const font = String(this.font ?? "");
      return {
        width: estimateDiagramTextWidth(String(text ?? ""), shimFontSize(font), shimIsBold(font)),
      };
    },
    fillText() {},
    strokeText() {},
    fillRect() {},
    clearRect() {},
    drawImage() {},
    putImageData() {},
    getImageData: (_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }),
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }),
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    save() {},
    restore() {},
    scale() {},
    translate() {},
    setTransform() {},
  })) as unknown as HTMLCanvasElement["getContext"];
}

function installLocalPlantUmlLibraryFetch(): void {
  const originalFetch = globalThis.fetch.bind(globalThis);
  const libraryMarker = "/plantuml-lib/";

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const markerIndex = url.indexOf(libraryMarker);
    if (markerIndex < 0) {
      return originalFetch(input, init);
    }

    const relative = decodeURIComponent(url.slice(markerIndex + 1));
    const filePath = path.join(appRoot, "public", relative);
    const body = await readFile(filePath, "utf8");
    return new Response(body, { status: 200 });
  };
}

async function installBrowserPlantUml(): Promise<void> {
  installJsdomDiagramShims();
  installLocalPlantUmlLibraryFetch();
  if (typeof window === "undefined" || window.PlantUML?.renderToString) {
    return;
  }

  await import("@plantuml/core/viz-global.js");
  const plantuml = (await import("@plantuml/core")) as PlantUmlApi;
  window.PlantUML = plantuml;
}

function selectedFormats(): ReadonlySet<string> | null {
  const raw = process.env.WIZARD_THUMBNAIL_FORMATS?.trim();
  if (!raw) {
    return null;
  }

  return new Set(raw.split(",").map((format) => format.trim()).filter(Boolean));
}

export async function writeWizardThumbnails(): Promise<void> {
  await installBrowserPlantUml();
  const limit = Number(process.env.WIZARD_THUMBNAIL_LIMIT ?? "0");
  const formats = selectedFormats();
  const examples = listDiagramExamples()
    .filter((example) => formats === null || formats.has(example.format))
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : undefined);

  for (const locale of LOCALES) {
    await mkdir(path.join(thumbnailRoot, locale), { recursive: true });
  }

  for (const example of examples) {
    for (const locale of LOCALES) {
      const filePath = path.join(
        thumbnailRoot,
        locale,
        wizardThumbnailFileName(example.format, example.sampleId),
      );
      if (existsSync(filePath)) {
        continue;
      }

      const source = getSampleSource(
        { format: example.format, id: example.sampleId },
        locale,
      );
      let svg: string;
      try {
        svg = await Promise.race([
          renderDiagramToSvg(source, example.format, {
            dark: false,
            layout: LAYOUT_ENGINES.smetana,
          }),
          new Promise<string>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Thumbnail timed out: ${example.id} (${locale})`)),
              THUMBNAIL_RENDER_TIMEOUT_MS,
            );
          }),
        ]);
        if (!svg.includes("<svg")) {
          throw new Error(`Thumbnail for ${example.id} (${locale}) is not SVG`);
        }
      } catch (error) {
        const detail = error instanceof LocalizedAppError
          ? `${error.message} ${JSON.stringify(error.messageParams ?? {})}`
          : error instanceof Error
            ? error.message
            : String(error);
        throw new Error(`Thumbnail failed for ${example.id} (${locale}): ${detail}`, {
          cause: error,
        });
      }
      await writeFile(filePath, svg, "utf8");
    }
  }
}
