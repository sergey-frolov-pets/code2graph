import {
  AI_CHAT_ATTACHMENT_EMPTY_TEXT,
  AI_CHAT_ATTACHMENT_EXCERPT_MAX_CHARS,
  AI_CHAT_ATTACHMENT_FILE_MAX_BYTES,
  AI_CHAT_ATTACHMENT_NAME_MAX_CHARS,
  AI_CHAT_IMAGE_EXTENSIONS,
  AI_CHAT_IMAGE_MIME_TYPES,
  AI_CHAT_MARKDOWN_EXTENSIONS,
  AI_CHAT_MESSAGE_MAX_CHARS,
  AI_CHAT_SPREADSHEET_EXTENSIONS,
  AI_CHAT_SPREADSHEET_MIME_TYPE,
  AI_CHAT_TEXT_EXTENSIONS,
  type AiChatAttachmentKind,
} from "@/constants/ai-chat";
import { DIAGRAM_FILE_ACCEPT, detectFormatFromFileName } from "@/languages/registry";
import type { AiChatAttachment } from "@/types/ai-chat-session";
import { extractPdfText } from "@/utils/ai-chat-pdf-text";
import { extractXlsxText } from "@/utils/ai-chat-xlsx-text";

const TEXT_FILE_EXTENSION = ".txt";
const PDF_EXTENSION = ".pdf";
const PDF_MIME_TYPE = "application/pdf";
const SVG_EXTENSION = ".svg";
const SVG_MIME_TYPE = "image/svg+xml";
const JSON_MIME_TYPE = "application/json";
const BASE64_CHUNK = 0x8000;

const IMAGE_MIME_BY_EXTENSION: Record<(typeof AI_CHAT_IMAGE_EXTENSIONS)[number], string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const AI_CHAT_ATTACHMENT_ACCEPT = [
  DIAGRAM_FILE_ACCEPT,
  ...AI_CHAT_TEXT_EXTENSIONS,
  PDF_EXTENSION,
  PDF_MIME_TYPE,
  ...AI_CHAT_SPREADSHEET_EXTENSIONS,
  AI_CHAT_SPREADSHEET_MIME_TYPE,
  ...AI_CHAT_IMAGE_EXTENSIONS,
  ...AI_CHAT_IMAGE_MIME_TYPES,
].join(",");

export interface AiChatReadAttachment extends AiChatAttachment {
  imageBase64?: string;
}

export type ReadAiChatAttachmentResult =
  | { ok: true; attachment: AiChatReadAttachment }
  | { ok: false; reason: "too-large" | "unsupported" | "read-error" };

function extensionOf(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

function isMarkdownName(fileName: string): boolean {
  const extension = extensionOf(fileName);
  return (AI_CHAT_MARKDOWN_EXTENSIONS as readonly string[]).includes(extension);
}

function imageMimeFor(fileName: string, mimeType: string): string | null {
  const extension = extensionOf(fileName);
  if ((AI_CHAT_IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
    return IMAGE_MIME_BY_EXTENSION[extension as (typeof AI_CHAT_IMAGE_EXTENSIONS)[number]];
  }
  const normalized = mimeType.toLowerCase() === "image/jpg" ? "image/jpeg" : mimeType.toLowerCase();
  if ((AI_CHAT_IMAGE_MIME_TYPES as readonly string[]).includes(normalized)) {
    return normalized;
  }
  return null;
}

export function classifyAiChatFile(fileName: string, mimeType: string): AiChatAttachmentKind | null {
  const extension = extensionOf(fileName);
  const mime = mimeType.toLowerCase();

  if ((AI_CHAT_SPREADSHEET_EXTENSIONS as readonly string[]).includes(extension) || mime === AI_CHAT_SPREADSHEET_MIME_TYPE) {
    return "spreadsheet";
  }
  if (extension === PDF_EXTENSION || mime === PDF_MIME_TYPE) {
    return "pdf";
  }
  if (extension === SVG_EXTENSION || mime === SVG_MIME_TYPE) {
    return "text";
  }
  if (extension !== TEXT_FILE_EXTENSION && detectFormatFromFileName(fileName)) {
    return "diagram";
  }
  if (imageMimeFor(fileName, mimeType)) {
    return "image";
  }
  if (
    (AI_CHAT_TEXT_EXTENSIONS as readonly string[]).includes(extension) ||
    mime.startsWith("text/") ||
    mime === JSON_MIME_TYPE
  ) {
    return "text";
  }
  return null;
}

export function promptKindForAttachment(attachment: Pick<AiChatAttachment, "name" | "kind">): string {
  if (isMarkdownName(attachment.name)) {
    return "markdown";
  }
  return attachment.kind;
}

const LAST_CONTROL_CHAR_CODE = 31;

function safeAttachmentName(name: string): string {
  let cleaned = "";
  for (const char of name) {
    const code = char.charCodeAt(0);
    cleaned += code <= LAST_CONTROL_CHAR_CODE || char === '"' ? " " : char;
  }
  return (cleaned.trim() || "file").slice(0, AI_CHAT_ATTACHMENT_NAME_MAX_CHARS);
}

function excerpt(text: string): string {
  let normalized = "";
  for (const char of text) {
    if (char.charCodeAt(0) > 0) {
      normalized += char;
    }
  }
  normalized = normalized.trim();
  const body = normalized || AI_CHAT_ATTACHMENT_EMPTY_TEXT;
  if (body.length <= AI_CHAT_ATTACHMENT_EXCERPT_MAX_CHARS) {
    return body;
  }
  return `${body.slice(0, AI_CHAT_ATTACHMENT_EXCERPT_MAX_CHARS)}\n…`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK));
  }
  return btoa(binary);
}

function mimeForKind(file: File, kind: AiChatAttachmentKind): string {
  if (kind === "image") {
    return imageMimeFor(file.name, file.type) ?? "image/png";
  }
  if (kind === "pdf") {
    return PDF_MIME_TYPE;
  }
  if (kind === "spreadsheet") {
    return AI_CHAT_SPREADSHEET_MIME_TYPE;
  }
  if (isMarkdownName(file.name)) {
    return "text/markdown";
  }
  return file.type || "text/plain";
}

export async function readAiChatAttachment(file: File): Promise<ReadAiChatAttachmentResult> {
  if (file.size > AI_CHAT_ATTACHMENT_FILE_MAX_BYTES) {
    return { ok: false, reason: "too-large" };
  }
  const kind = classifyAiChatFile(file.name, file.type);
  if (!kind) {
    return { ok: false, reason: "unsupported" };
  }

  try {
    const name = safeAttachmentName(file.name);
    const mimeType = mimeForKind(file, kind);
    if (kind === "image") {
      return {
        ok: true,
        attachment: {
          name,
          kind,
          mimeType,
          imageBase64: await blobToBase64(file),
        },
      };
    }
    if (kind === "pdf") {
      return {
        ok: true,
        attachment: {
          name,
          kind,
          mimeType,
          textExcerpt: excerpt(extractPdfText(new Uint8Array(await file.arrayBuffer()))),
        },
      };
    }
    if (kind === "spreadsheet") {
      return {
        ok: true,
        attachment: {
          name,
          kind,
          mimeType,
          textExcerpt: excerpt(await extractXlsxText(file)),
        },
      };
    }
    return {
      ok: true,
      attachment: {
        name,
        kind,
        mimeType,
        textExcerpt: excerpt(await file.text()),
      },
    };
  } catch {
    return { ok: false, reason: "read-error" };
  }
}

function formatAttachmentBlock(attachment: AiChatAttachment): string {
  const name = safeAttachmentName(attachment.name);
  const kindLabel = promptKindForAttachment(attachment);
  const body = attachment.textExcerpt?.trim();
  if (attachment.kind === "image") {
    return body
      ? `Attached image file "${name}":\n"""\n${body}\n"""`
      : `Attached image file "${name}".`;
  }
  if (!body) {
    return "";
  }
  return `Attached ${kindLabel} file "${name}":\n"""\n${body}\n"""`;
}

/** Текст пользователя плюс выдержки из файлов, в пределах лимита прокси. */
export function composeAiChatUserContent(
  text: string,
  attachments: readonly AiChatAttachment[],
): string {
  const head = text.trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS);
  const blocks = attachments.map((attachment) => formatAttachmentBlock(attachment)).filter((block) => block.length > 0);
  if (blocks.length === 0) {
    return head;
  }
  const separator = "\n\n";
  const room = AI_CHAT_MESSAGE_MAX_CHARS - head.length - separator.length;
  if (room <= 0) {
    return head;
  }
  const perBlock = Math.max(1, Math.floor(room / blocks.length));
  const fitted = blocks.map((block) => (block.length <= perBlock ? block : `${block.slice(0, perBlock)}\n…`));
  return `${head}${separator}${fitted.join(separator)}`.slice(0, AI_CHAT_MESSAGE_MAX_CHARS);
}
