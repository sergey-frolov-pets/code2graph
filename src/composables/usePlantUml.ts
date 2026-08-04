import type { LayoutEngine } from "@/constants";
import type { PlantUmlApi, PlantUmlRenderOptions } from "@/types/plantuml";
import {
  checkPlantUmlSyntax,
  isPlantUmlErrorSvg,
  parsePlantUmlErrorFromSvg,
  parsePlantUmlErrorLine,
  type SyntaxCheckResult,
} from "@/utils/plantuml-syntax";
import { preparePlantUmlSource, splitSourceLines } from "@/utils/plantuml-source";
import { LocalizedAppError } from "@/utils/localized-app-error";

const VIZ_SOURCE_ID = "vendor-viz-global";
const PLANTUML_SOURCE_ID = "vendor-plantuml";

let enginePromise: Promise<PlantUmlApi> | null = null;
let renderQueue: Promise<void> = Promise.resolve();
let vizGlobalPromise: Promise<void> | null = null;

function getVendorUrl(fileName: string): string {
  return new URL(`./vendor/${fileName}`, window.location.href).href;
}

function getEmbeddedPayload(elementId: string): string | null {
  const node = document.getElementById(elementId);
  const payload = node?.textContent?.trim();
  return payload ? payload : null;
}

async function decompressGzipBase64(payload: string): Promise<string> {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  if (typeof DecompressionStream === "undefined") {
    throw new LocalizedAppError("engine.noDecompression");
  }

  const stream = new Response(bytes)
    .body!.pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

async function loadEmbeddedSource(elementId: string): Promise<string | null> {
  let payload = getEmbeddedPayload(elementId);

  if (!payload) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    payload = getEmbeddedPayload(elementId);
  }

  if (!payload) {
    return null;
  }

  return decompressGzipBase64(payload);
}

function runEmbeddedScript(source: string): void {
  const script = document.createElement("script");
  // Изолируем vendor-скрипты: без IIFE их let/const конфликтуют между собой
  // (например, viz-global.js и plantuml.js из @plantuml/core).
  script.text = `(function(){\n${source}\n})();`;
  document.head.appendChild(script);
}

function loadVizGlobalFromFile(): Promise<void> {
  if (window.Viz) {
    return Promise.resolve();
  }

  if (!vizGlobalPromise) {
    vizGlobalPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = getVendorUrl("viz-global.js");
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new LocalizedAppError("engine.vizLoadFailed"));
      document.head.appendChild(script);
    });
  }

  return vizGlobalPromise;
}

async function loadVizGlobal(): Promise<void> {
  if (window.Viz) {
    return;
  }

  const embeddedSource = await loadEmbeddedSource(VIZ_SOURCE_ID);
  if (embeddedSource) {
    runEmbeddedScript(embeddedSource);
    if (!window.Viz) {
      throw new LocalizedAppError("engine.vizInitFailed");
    }
    return;
  }

  if (import.meta.env.DEV) {
    await loadVizGlobalFromFile();
    return;
  }

  throw new LocalizedAppError("engine.vizEmbeddedMissing");
}

async function loadEngine(): Promise<PlantUmlApi> {
  if (!enginePromise) {
    enginePromise = (async () => {
      if (window.PlantUML) {
        return window.PlantUML;
      }

      await loadVizGlobal();

      const embeddedSource = await loadEmbeddedSource(PLANTUML_SOURCE_ID);
      if (embeddedSource) {
        runEmbeddedScript(embeddedSource);
        if (!window.PlantUML) {
          throw new LocalizedAppError("engine.plantumlInitFailed");
        }
        return window.PlantUML;
      }

      if (import.meta.env.DEV) {
        return import(/* @vite-ignore */ getVendorUrl(
          "plantuml.js",
        )) as Promise<PlantUmlApi>;
      }

      throw new LocalizedAppError("engine.plantumlEmbeddedMissing");
    })();
  }

  return enginePromise;
}

function enqueueRender<T>(task: () => Promise<T>): Promise<T> {
  const next = renderQueue.then(task, task);
  renderQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function renderPlantUmlToSvg(
  lines: string[],
  options: PlantUmlRenderOptions = {},
): Promise<string> {
  const engine = await loadEngine();

  return enqueueRender(
    () =>
      new Promise<string>((resolve, reject) => {
        engine.renderToString(
          lines,
          (svg) => resolve(svg),
          (message) => reject(new Error(message)),
          options,
        );
      }),
  );
}

export function isVizGlobalReady(): boolean {
  return typeof window !== "undefined" && Boolean(window.Viz);
}

export function isPlantUmlEngineReady(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.PlantUML?.renderToString)
  );
}

export function isEngineReady(): boolean {
  return isVizGlobalReady() && isPlantUmlEngineReady();
}

export async function waitForEngineReady(): Promise<void> {
  await loadEngine();
}

export async function validatePlantUmlSyntax(
  source: string,
  layout: LayoutEngine,
  darkMode = false,
): Promise<SyntaxCheckResult> {
  const staticCheck = checkPlantUmlSyntax(source);
  if (!staticCheck.valid) {
    return staticCheck;
  }

  try {
    const prepared = await preparePlantUmlSource(source, layout);
    const lines = splitSourceLines(prepared);
    const rendered = await renderPlantUmlToSvg(lines, { dark: darkMode });
    if (isPlantUmlErrorSvg(rendered)) {
      return {
        valid: false,
        issues: parsePlantUmlErrorFromSvg(rendered),
      };
    }
    return { valid: true, issues: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const line = parsePlantUmlErrorLine(message);
    return {
      valid: false,
      issues: [{ severity: "error", message, line }],
    };
  }
}
