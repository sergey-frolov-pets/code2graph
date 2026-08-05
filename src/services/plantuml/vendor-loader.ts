import type { PlantUmlApi } from "@/types/plantuml";
import { LocalizedAppError } from "@/utils/localized-app-error";

const VIZ_SOURCE_ID = "vendor-viz-global";
const PLANTUML_SOURCE_ID = "vendor-plantuml";

let enginePromise: Promise<PlantUmlApi> | null = null;
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

export async function loadVizGlobal(): Promise<void> {
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

export async function loadEngine(): Promise<PlantUmlApi> {
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
