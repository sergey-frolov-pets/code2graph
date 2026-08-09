import {
  CONVERSION_IR_VERSION,
  SVG_METADATA_ENCODING_GZIP,
  SVG_METADATA_ENCODING_PLAIN,
  SVG_METADATA_ID,
  type SvgMetadataEncoding,
} from "@/constants/conversion-settings";
import type { DiagramIR } from "@/services/conversion/diagram-ir";

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""),
  );
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Utf8(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value));
}

function decodeBase64Utf8(value: string): string {
  return new TextDecoder().decode(base64ToBytes(value));
}

async function gzipUtf8(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

async function gunzipUtf8(payload: string): Promise<string> {
  const bytes = base64ToBytes(payload);

  if (typeof DecompressionStream === "undefined") {
    throw new Error("conversion.error.noDecompression");
  }

  const stream = new Response(bytes)
    .body!.pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function parseMetadataAttributes(metadataTag: string): {
  encoding: SvgMetadataEncoding;
  version: number;
  payload: string;
} | null {
  const encodingMatch = metadataTag.match(/data-encoding="([^"]+)"/);
  const versionMatch = metadataTag.match(/data-version="(\d+)"/);
  const payloadMatch = metadataTag.match(/<metadata[^>]*>([\s\S]*?)<\/metadata>/);

  if (!payloadMatch?.[1]) {
    return null;
  }

  const encoding = encodingMatch?.[1] as SvgMetadataEncoding | undefined;
  const version = Number(versionMatch?.[1] ?? CONVERSION_IR_VERSION);

  return {
    encoding:
      encoding === SVG_METADATA_ENCODING_GZIP
        ? SVG_METADATA_ENCODING_GZIP
        : SVG_METADATA_ENCODING_PLAIN,
    version,
    payload: payloadMatch[1].trim(),
  };
}

async function decodeMetadataPayload(
  payload: string,
  encoding: SvgMetadataEncoding,
): Promise<string> {
  if (encoding === SVG_METADATA_ENCODING_GZIP) {
    return gunzipUtf8(payload);
  }

  return decodeBase64Utf8(payload);
}

function buildMetadataElement(
  payload: string,
  encoding: SvgMetadataEncoding,
): string {
  return `<metadata id="${SVG_METADATA_ID}" data-version="${CONVERSION_IR_VERSION}" data-encoding="${encoding}">${payload}</metadata>`;
}

export async function embedSvgMetadata(svg: string, ir: DiagramIR): Promise<string> {
  if (!svg.includes("<svg")) {
    return svg;
  }

  const json = JSON.stringify(ir);
  let encoding: SvgMetadataEncoding = SVG_METADATA_ENCODING_GZIP;
  let payload = "";

  try {
    payload = await gzipUtf8(json);
  } catch {
    encoding = SVG_METADATA_ENCODING_PLAIN;
    payload = encodeBase64Utf8(json);
  }

  const metadata = buildMetadataElement(payload, encoding);

  if (svg.includes(`id="${SVG_METADATA_ID}"`)) {
    return svg.replace(
      new RegExp(`<metadata id="${SVG_METADATA_ID}"[\\s\\S]*?</metadata>`),
      metadata,
    );
  }

  return svg.replace(/<svg([^>]*)>/i, `<svg$1>\n  ${metadata}`);
}

export async function readSvgMetadata(svg: string): Promise<DiagramIR | null> {
  const match = svg.match(
    new RegExp(`<metadata id="${SVG_METADATA_ID}"[^>]*>[\\s\\S]*?</metadata>`),
  );
  if (!match?.[0]) {
    return null;
  }

  const parsed = parseMetadataAttributes(match[0]);
  if (!parsed) {
    return null;
  }

  try {
    const json = await decodeMetadataPayload(parsed.payload, parsed.encoding);
    const diagram = JSON.parse(json) as DiagramIR;
    if (diagram.version !== CONVERSION_IR_VERSION) {
      return null;
    }
    return diagram;
  } catch {
    return null;
  }
}
