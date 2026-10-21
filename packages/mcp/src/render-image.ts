import { DiagramImageError } from "./diagram-image-error.js";
import { renderGraphmlSvg } from "./graphml-svg.js";
import { encodeMermaidInkPath } from "./mermaid-ink.js";
import { rasterizeSvg } from "./rasterize-svg.js";
import {
  DEFAULT_KROKI_URL,
  DEFAULT_MERMAID_INK_URL,
  ERROR_BODY_LIMIT,
  JPEG_MIME_TYPE,
  JPEG_SIGNATURE,
  KROKI_URL_ENV,
  MAX_RENDER_BYTES,
  MERMAID_INK_MAX_URL_LENGTH,
  MERMAID_INK_URL_ENV,
  PNG_MIME_TYPE,
  PNG_SIGNATURE,
  RENDER_TIMEOUT_MS,
} from "./render-limits.js";
import { renderWiremarkSvg } from "./wiremark-svg.js";

const KROKI_PNG_TYPES = {
  plantuml: "plantuml",
  structurizr: "structurizr",
} as const;

export interface DiagramImage {
  mimeType: typeof PNG_MIME_TYPE | typeof JPEG_MIME_TYPE;
  base64: string;
}

export interface RenderDependencies {
  fetch: typeof fetch;
  krokiUrl: string;
  mermaidInkUrl: string;
  renderGraphmlSvg: (source: string) => string;
  renderWiremarkSvg: (source: string) => string;
  rasterizeSvg: (svg: string) => Uint8Array;
}

function trimBase(url: string): string {
  return url.trim().replace(/\/$/, "");
}

export function createDefaultRenderDependencies(): RenderDependencies {
  return {
    fetch: globalThis.fetch,
    krokiUrl: trimBase(process.env[KROKI_URL_ENV] ?? DEFAULT_KROKI_URL),
    mermaidInkUrl: trimBase(process.env[MERMAID_INK_URL_ENV] ?? DEFAULT_MERMAID_INK_URL),
    renderGraphmlSvg,
    renderWiremarkSvg,
    rasterizeSvg,
  };
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function decodeSnippet(bytes: Uint8Array): string {
  const text = new TextDecoder()
    .decode(bytes.subarray(0, ERROR_BODY_LIMIT))
    .replace(/\s+/g, " ")
    .trim();
  return text || "empty response";
}

function assertSize(bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_RENDER_BYTES) {
    throw new DiagramImageError("Rendered image is too large");
  }
}

async function readResponse(response: Response): Promise<Uint8Array> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!response.ok) {
    throw new DiagramImageError(
      `Render failed with ${response.status}: ${decodeSnippet(bytes)}`,
    );
  }
  assertSize(bytes);
  return bytes;
}

async function requestBytes(
  deps: RenderDependencies,
  url: string,
  init: RequestInit,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  let response: Response;
  try {
    response = await deps.fetch(url, {
      ...init,
      signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new DiagramImageError(`Image request failed: ${detail}`);
  }

  const bytes = await readResponse(response);
  return {
    bytes,
    contentType: response.headers.get("content-type") ?? "",
  };
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function pngImage(bytes: Uint8Array): DiagramImage {
  if (!startsWith(bytes, PNG_SIGNATURE)) {
    throw new DiagramImageError("Renderer did not return a PNG image");
  }
  return { mimeType: PNG_MIME_TYPE, base64: toBase64(bytes) };
}

async function renderKrokiPng(
  deps: RenderDependencies,
  diagramType: string,
  source: string,
): Promise<DiagramImage> {
  const { bytes } = await requestBytes(
    deps,
    `${deps.krokiUrl}/${diagramType}/png`,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: source,
    },
  );
  return pngImage(bytes);
}

async function renderKrokiSvgPng(
  deps: RenderDependencies,
  diagramType: string,
  source: string,
): Promise<DiagramImage> {
  const { bytes } = await requestBytes(
    deps,
    `${deps.krokiUrl}/${diagramType}/svg`,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: source,
    },
  );
  const svg = new TextDecoder().decode(bytes);
  if (!svg.includes("<svg")) {
    throw new DiagramImageError(`${diagramType} renderer did not return SVG`);
  }
  return pngImage(deps.rasterizeSvg(svg));
}

async function renderMermaid(
  deps: RenderDependencies,
  source: string,
): Promise<DiagramImage> {
  const encoded = encodeMermaidInkPath(source);
  const url = `${deps.mermaidInkUrl}/img/${encoded}`;
  if (url.length > MERMAID_INK_MAX_URL_LENGTH) {
    throw new DiagramImageError("Diagram is too large for mermaid.ink");
  }

  const { bytes, contentType } = await requestBytes(deps, url, { method: "GET" });
  if (startsWith(bytes, PNG_SIGNATURE) || contentType.includes(PNG_MIME_TYPE)) {
    return pngImage(bytes);
  }
  if (startsWith(bytes, JPEG_SIGNATURE) || contentType.includes(JPEG_MIME_TYPE)) {
    if (!startsWith(bytes, JPEG_SIGNATURE)) {
      throw new DiagramImageError("mermaid.ink did not return a JPEG image");
    }
    return { mimeType: JPEG_MIME_TYPE, base64: toBase64(bytes) };
  }
  throw new DiagramImageError("mermaid.ink did not return an image");
}

function renderLocalSvg(
  svg: string,
  deps: RenderDependencies,
): DiagramImage {
  return pngImage(deps.rasterizeSvg(svg));
}

export async function renderDiagramImage(
  format: string,
  source: string,
  deps: RenderDependencies = createDefaultRenderDependencies(),
): Promise<DiagramImage> {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new DiagramImageError("Diagram source is empty");
  }

  switch (format) {
    case "plantuml":
    case "structurizr":
      return renderKrokiPng(deps, KROKI_PNG_TYPES[format], trimmed);
    case "d2":
      return renderKrokiSvgPng(deps, "d2", trimmed);
    case "mermaid":
      return renderMermaid(deps, trimmed);
    case "graphml":
      return renderLocalSvg(deps.renderGraphmlSvg(trimmed), deps);
    case "wiremark":
      return renderLocalSvg(deps.renderWiremarkSvg(trimmed), deps);
    default:
      throw new DiagramImageError(`No image renderer for ${format}`);
  }
}
