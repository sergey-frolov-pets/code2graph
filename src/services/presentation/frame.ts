import { FRAME_MARKER, FRAME_MAX_BYTES } from "@/services/presentation/constants";

const FRAME_PNG_MIME = "image/png";
const FRAME_SVG_MIME = "image/svg+xml";
const FRAME_MIMES = [FRAME_PNG_MIME, FRAME_SVG_MIME] as const;

const FRAME_LINE_PATTERN = new RegExp(
  `^[^\\n]*${FRAME_MARKER}\\s+image\\/(?:png|svg\\+xml);base64,[A-Za-z0-9+/=]+[^\\n]*\\r?\\n?`,
  "m",
);

const FRAME_READ_PATTERN = new RegExp(
  `${FRAME_MARKER}\\s+(image\\/(?:png|svg\\+xml));base64,([A-Za-z0-9+/=]+)`,
);

export type FrameImportErrorKey =
  | "preview.frame.unsupported"
  | "preview.frame.tooLarge"
  | "preview.frame.readFailed";

export interface FrameImportSuccess {
  ok: true;
  label: string;
  source: string;
}

export interface FrameImportFailure {
  ok: false;
  errorKey: FrameImportErrorKey;
}

export type FrameImportResult = FrameImportSuccess | FrameImportFailure;

export function frameMime(file: File): string | null {
  const type = file.type.toLowerCase();
  if (type === FRAME_PNG_MIME || type === FRAME_SVG_MIME) {
    return type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) {
    return FRAME_PNG_MIME;
  }
  if (name.endsWith(".svg")) {
    return FRAME_SVG_MIME;
  }
  return null;
}

export function frameLabel(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return base || "frame";
}

export function buildFrameDiagramSource(mime: string, base64: string): string {
  return `%% ${FRAME_MARKER} ${mime};base64,${base64}
flowchart TB
  frame[" "]
  style frame fill:transparent,stroke:transparent,color:transparent
`;
}

export function readFrameHref(source: string): string | null {
  const match = FRAME_READ_PATTERN.exec(source);
  if (!match) {
    return null;
  }
  return `data:${match[1]};base64,${match[2]}`;
}

/** Removes the frame comment so the diagram engine never parses the picture. */
export function stripFrameBlock(source: string): string {
  let current = source;
  for (let guard = 0; guard < 4; guard += 1) {
    const next = current.replace(FRAME_LINE_PATTERN, "");
    if (next === current) {
      return current;
    }
    current = next;
  }
  return current;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function readFrameFile(file: File): Promise<FrameImportResult> {
  const mime = frameMime(file);
  if (!mime || !FRAME_MIMES.includes(mime as (typeof FRAME_MIMES)[number])) {
    return { ok: false, errorKey: "preview.frame.unsupported" };
  }
  if (file.size > FRAME_MAX_BYTES) {
    return { ok: false, errorKey: "preview.frame.tooLarge" };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return {
      ok: true,
      label: frameLabel(file.name),
      source: buildFrameDiagramSource(mime, bytesToBase64(bytes)),
    };
  } catch {
    return { ok: false, errorKey: "preview.frame.readFailed" };
  }
}
