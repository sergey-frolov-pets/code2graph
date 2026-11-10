import { FRAME_MARKER, FRAME_MAX_BYTES } from "@/services/presentation/constants";

/** Extensions a browser can paint in an image element, mapped to a canonical MIME type. */
const FRAME_EXTENSION_MIME = {
  png: "image/png",
  apng: "image/apng",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
} as const;

const FRAME_ACCEPTED_MIMES = new Set<string>(Object.values(FRAME_EXTENSION_MIME));

const FRAME_MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/vnd.microsoft.icon": "image/x-icon",
  "image/x-ms-bmp": "image/bmp",
};

const FRAME_MIME_TOKEN = "image\\/[a-zA-Z0-9][a-zA-Z0-9.+-]*";

const FRAME_LINE_PATTERN = new RegExp(
  `^[^\\n]*${FRAME_MARKER}\\s+${FRAME_MIME_TOKEN};base64,[A-Za-z0-9+/=]+[^\\n]*\\r?\\n?`,
  "m",
);

const FRAME_READ_PATTERN = new RegExp(
  `${FRAME_MARKER}\\s+(${FRAME_MIME_TOKEN});base64,([A-Za-z0-9+/=]+)`,
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

function canonicalFrameMime(type: string): string | null {
  const lower = type.trim().toLowerCase();
  const mime = FRAME_MIME_ALIASES[lower] ?? lower;
  return FRAME_ACCEPTED_MIMES.has(mime) ? mime : null;
}

export function frameMime(file: File): string | null {
  const fromType = canonicalFrameMime(file.type);
  if (fromType) {
    return fromType;
  }
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (extension in FRAME_EXTENSION_MIME) {
    return FRAME_EXTENSION_MIME[extension as keyof typeof FRAME_EXTENSION_MIME];
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
  const mime = canonicalFrameMime(match[1]);
  if (!mime) {
    return null;
  }
  return `data:${mime};base64,${match[2]}`;
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
  if (!mime) {
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
