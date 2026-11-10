import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { DIAGRAM_FORMATS } from "@/constants/diagram-format-ids";
import {
  PRESENTATION_MARKER,
  PRESENTATION_SCHEMA_VERSION,
} from "@/services/presentation/constants";
import { sanitizePresentationDocument } from "@/services/presentation/model";
import type { PresentationDocument } from "@/services/presentation/types";

const PAYLOAD_PATTERN = new RegExp(
  `${PRESENTATION_MARKER}\\s+v${PRESENTATION_SCHEMA_VERSION}\\s+([A-Za-z0-9+/=]+)`,
);

const BLOCK_LINE_PATTERN = new RegExp(
  `^[^\\n]*${PRESENTATION_MARKER}\\s+v${PRESENTATION_SCHEMA_VERSION}\\s+[A-Za-z0-9+/=]+[^\\n]*\\r?\\n?`,
  "m",
);

function encodePayload(document: PresentationDocument): string {
  const bytes = new TextEncoder().encode(JSON.stringify(document));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodePayload(payload: string): string {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function wrapBlock(format: DiagramFormat, payload: string): string {
  const body = `${PRESENTATION_MARKER} v${PRESENTATION_SCHEMA_VERSION} ${payload}`;
  switch (format) {
    case "plantuml":
      return `/' ${body} '/`;
    case "mermaid":
      return `%% ${body}`;
    case "d2":
      return `# ${body}`;
    case "structurizr":
    case "wiremark":
      return `// ${body}`;
    case "graphml":
      return `<!-- ${body} -->`;
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
}

/** Removes every presentation comment so engines never see the track payload. */
export function stripPresentationBlock(source: string): string {
  let current = source;
  for (let guard = 0; guard < 8; guard += 1) {
    const next = current.replace(BLOCK_LINE_PATTERN, "");
    if (next === current) {
      return current;
    }
    current = next;
  }
  return current;
}

export function readPresentation(source: string): PresentationDocument | null {
  const match = PAYLOAD_PATTERN.exec(source);
  if (!match) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(decodePayload(match[1]));
    return sanitizePresentationDocument(parsed);
  } catch {
    return null;
  }
}

/**
 * Replaces the presentation comment. A document with no tracks removes the block.
 * The returned text keeps the diagram source that engines should render.
 */
export function writePresentation(
  source: string,
  format: DiagramFormat,
  document: PresentationDocument | null,
): string {
  const stripped = stripPresentationBlock(source).replace(/\s+$/, "");
  if (!document || document.tracks.length === 0) {
    return stripped;
  }

  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const line = wrapBlock(format, encodePayload(document));
  if (!stripped) {
    return `${line}${newline}`;
  }
  return `${stripped}${newline}${line}${newline}`;
}

export function presentationFormats(): readonly DiagramFormat[] {
  return DIAGRAM_FORMATS;
}
