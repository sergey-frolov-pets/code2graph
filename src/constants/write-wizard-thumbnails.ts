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
import {
  canvasTextMetrics,
  estimateElementTextBox,
} from "@/services/diagram-text-metrics";
import type { PlantUmlApi } from "@/types/plantuml";
import { LocalizedAppError } from "@/utils/localized-app-error";

const LOCALES: readonly AppLocale[] = ["ru", "en"];
const THUMBNAIL_RENDER_TIMEOUT_MS = 45_000;

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const thumbnailRoot = path.resolve(appRoot, "src/assets/wizard-thumbnails");

export function installJsdomDiagramShims(): void {
  if (typeof window === "undefined" || window.PlantUML?.renderToString) {
    return;
  }

  const svgPrototype = SVGElement.prototype as SVGElement & {
    getBBox: () => DOMRect;
  };
  svgPrototype.getBBox = function getBBox(this: SVGElement) {
    const tag = this.tagName.toLowerCase();
    if (tag !== "text" && tag !== "tspan") {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      } as DOMRect;
    }

    return estimateElementTextBox(this) as DOMRect;
  };
  const originalRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function getBoundingClientRect(
    this: Element,
  ): DOMRect {
    if (!isTextLabel(this)) {
      return originalRect.call(this);
    }

    const box = estimateElementTextBox(this);
    return new DOMRect(0, 0, box.width, box.height);
  };
  const computedTextLength = function computedTextLength(this: SVGElement) {
    const tag = this.tagName.toLowerCase();
    if (tag !== "text" && tag !== "tspan") {
      return 0;
    }

    return estimateElementTextBox(this).width;
  };
  Object.assign(SVGElement.prototype, { getComputedTextLength: computedTextLength });
  Object.assign(Element.prototype, { getComputedTextLength: computedTextLength });
  HTMLCanvasElement.prototype.getContext = (() => {
    const state = { font: "10px sans-serif" };
    return {
    get font() {
      return state.font;
    },
    set font(value: string) {
      state.font = value;
    },
    measureText: (text: string) => canvasTextMetrics(String(text ?? ""), state.font),
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
  };
  }) as unknown as HTMLCanvasElement["getContext"];
}

const LABEL_TAGS = new Set(["text", "tspan", "span", "p", "div", "foreignobject"]);

function isTextLabel(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (!LABEL_TAGS.has(tag)) {
    return false;
  }

  if (!(element.textContent ?? "").trim()) {
    return false;
  }

  return [...element.children].every((child) =>
    LABEL_TAGS.has(child.tagName.toLowerCase()),
  );
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
    // Mermaid sizes the finished svg with getBBox() on the root. jsdom has no
    // real font layout, so rebuilding those thumbnails here blows up the viewBox.
    if (example.format === "mermaid") {
      continue;
    }

    for (const locale of LOCALES) {
      const filePath = path.join(
        thumbnailRoot,
        locale,
        wizardThumbnailFileName(example.format, example.sampleId),
      );
      if (process.env.WIZARD_THUMBNAIL_FORCE !== "1" && existsSync(filePath)) {
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
