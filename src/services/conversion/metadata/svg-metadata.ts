import { CONVERSION_IR_VERSION, SVG_METADATA_ID } from "@/constants/conversion-settings";
import type { DiagramIR } from "@/services/conversion/diagram-ir";

function encodeBase64Utf8(value: string): string {
  return btoa(
    Array.from(new TextEncoder().encode(value), (byte) =>
      String.fromCharCode(byte),
    ).join(""),
  );
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function embedSvgMetadata(svg: string, ir: DiagramIR): string {
  if (!svg.includes("<svg")) {
    return svg;
  }

  const payload = encodeBase64Utf8(JSON.stringify(ir));
  const metadata = `<metadata id="${SVG_METADATA_ID}" data-version="${CONVERSION_IR_VERSION}" data-encoding="base64">${payload}</metadata>`;

  if (svg.includes(`id="${SVG_METADATA_ID}"`)) {
    return svg.replace(
      new RegExp(`<metadata id="${SVG_METADATA_ID}"[\\s\\S]*?</metadata>`),
      metadata,
    );
  }

  return svg.replace(/<svg([^>]*)>/i, `<svg$1>\n  ${metadata}`);
}

export function readSvgMetadata(svg: string): DiagramIR | null {
  const match = svg.match(
    new RegExp(`<metadata id="${SVG_METADATA_ID}"[^>]*>([\\s\\S]*?)</metadata>`),
  );
  if (!match?.[1]) {
    return null;
  }

  try {
    const json = decodeBase64Utf8(match[1].trim());
    const parsed = JSON.parse(json) as DiagramIR;
    if (parsed.version !== CONVERSION_IR_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
