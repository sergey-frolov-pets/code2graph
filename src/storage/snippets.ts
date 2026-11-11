import {
  isSnippetCategoryId,
  isSnippetLanguageId,
  type CustomSnippet,
  type SnippetCategoryId,
  type SnippetLanguageId,
} from "@/types/snippets";
import {
  readStorageJson,
  writeStorageJson,
} from "@/core/safe-storage";

export const STORAGE_KEY_CUSTOM_SNIPPETS = "code2graph-custom-snippets";
export const STORAGE_KEY_SNIPPETS_PANEL_POSITION =
  "code2graph-snippets-panel-position";

export const SNIPPETS_EXPORT_VERSION = 2;
export const SNIPPETS_EXPORT_FILE_NAME = "code2graph-snippets.txt";
export const SNIPPETS_IMPORT_ACCEPT =
  "text/plain,application/json,.txt,.json";

export const SNIPPETS_TEXT_HEADER_PREFIX = "# code2graph-snippets";
export const SNIPPETS_TEXT_BLOCK_START = "=== SNIPPET ===";
export const SNIPPETS_TEXT_BODY_DIVIDER = "---";
export const SNIPPETS_TEXT_BLOCK_END = "=== END SNIPPET ===";
const SNIPPETS_TEXT_ESCAPED_END_PREFIX = "\\=== END SNIPPET ===";

const DEFAULT_SNIPPET_LANGUAGE: SnippetLanguageId = "plantuml";
const DEFAULT_SNIPPET_CATEGORY: SnippetCategoryId | "custom" = "custom";

export interface SnippetsExportPayload {
  version: number;
  exportedAt: string;
  snippets: CustomSnippet[];
}

function normalizeSnippetLanguage(value: unknown): SnippetLanguageId {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (isSnippetLanguageId(normalized)) {
      return normalized;
    }
  }
  return DEFAULT_SNIPPET_LANGUAGE;
}

function normalizeSnippetCategory(
  value: unknown,
): SnippetCategoryId | "custom" {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized === "custom") {
      return "custom";
    }
    if (isSnippetCategoryId(normalized)) {
      return normalized;
    }
  }
  return DEFAULT_SNIPPET_CATEGORY;
}

function normalizeRawSnippetRecord(value: unknown): CustomSnippet | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.title !== "string" ||
    typeof record.content !== "string"
  ) {
    return null;
  }

  const now = new Date().toISOString();
  const title = record.title.trim();
  if (!title || !record.content.trim()) {
    return null;
  }

  return {
    id: record.id.trim() || createCustomSnippetId(),
    language: normalizeSnippetLanguage(record.language),
    title,
    content: record.content,
    description:
      typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : undefined,
    categoryId: normalizeSnippetCategory(record.categoryId),
    createdAt:
      typeof record.createdAt === "string" && record.createdAt.trim()
        ? record.createdAt
        : now,
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt.trim()
        ? record.updatedAt
        : now,
  };
}

export function loadCustomSnippets(): CustomSnippet[] {
  return (
    readStorageJson(STORAGE_KEY_CUSTOM_SNIPPETS, (parsed) => {
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed
        .map(normalizeRawSnippetRecord)
        .filter((item): item is CustomSnippet => item !== null);
    }) ?? []
  );
}

export function saveCustomSnippets(snippets: CustomSnippet[]): void {
  writeStorageJson(STORAGE_KEY_CUSTOM_SNIPPETS, snippets);
}

export function createCustomSnippetId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildSnippetsExportPayload(
  snippets: CustomSnippet[],
): SnippetsExportPayload {
  return {
    version: SNIPPETS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    snippets,
  };
}

function escapeHeaderValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n");
}

function unescapeHeaderValue(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    if (ch === "\\" && index + 1 < value.length) {
      const next = value[index + 1];
      if (next === "n") {
        result += "\n";
        index += 1;
        continue;
      }
      if (next === "\\") {
        result += "\\";
        index += 1;
        continue;
      }
    }
    result += ch;
  }
  return result;
}

function escapeBodyContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      line === SNIPPETS_TEXT_BLOCK_END ||
      line.startsWith(SNIPPETS_TEXT_ESCAPED_END_PREFIX)
        ? `\\${line}`
        : line,
    )
    .join("\n");
}

function unescapeBodyLine(line: string): string {
  if (
    line === SNIPPETS_TEXT_ESCAPED_END_PREFIX ||
    line.startsWith(`\\${SNIPPETS_TEXT_ESCAPED_END_PREFIX}`)
  ) {
    return line.slice(1);
  }
  return line;
}

export function serializeSnippetsToText(snippets: CustomSnippet[]): string {
  const exportedAt = new Date().toISOString();
  const headerLines = [
    `${SNIPPETS_TEXT_HEADER_PREFIX} v${SNIPPETS_EXPORT_VERSION}`,
    `# exportedAt: ${exportedAt}`,
  ];

  if (snippets.length === 0) {
    return `${headerLines.join("\n")}\n`;
  }

  const blocks = snippets.map((snippet) => {
    const metaLines = [
      SNIPPETS_TEXT_BLOCK_START,
      `id: ${escapeHeaderValue(snippet.id)}`,
      `language: ${snippet.language}`,
      `category: ${snippet.categoryId}`,
      `title: ${escapeHeaderValue(snippet.title)}`,
    ];

    if (snippet.description) {
      metaLines.push(`description: ${escapeHeaderValue(snippet.description)}`);
    }

    metaLines.push(
      `createdAt: ${escapeHeaderValue(snippet.createdAt)}`,
      `updatedAt: ${escapeHeaderValue(snippet.updatedAt)}`,
      SNIPPETS_TEXT_BODY_DIVIDER,
      escapeBodyContent(snippet.content),
      SNIPPETS_TEXT_BLOCK_END,
    );

    return metaLines.join("\n");
  });

  return `${headerLines.join("\n")}\n\n${blocks.join("\n\n")}\n`;
}

function parseJsonSnippetsPayload(raw: string): CustomSnippet[] {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    const normalized = parsed
      .map(normalizeRawSnippetRecord)
      .filter((item): item is CustomSnippet => item !== null);
    if (normalized.length === 0 && parsed.length > 0) {
      throw new Error("invalid_snippets");
    }
    return normalized;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_format");
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.snippets)) {
    throw new Error("invalid_format");
  }

  const snippets = record.snippets
    .map(normalizeRawSnippetRecord)
    .filter((item): item is CustomSnippet => item !== null);
  if (snippets.length === 0 && record.snippets.length > 0) {
    throw new Error("invalid_snippets");
  }

  return snippets;
}

function parseTextSnippetBlock(
  headerLines: string[],
  bodyLines: string[],
): CustomSnippet | null {
  const meta: Record<string, string> = {};
  for (const rawLine of headerLines) {
    const colonIndex = rawLine.indexOf(":");
    if (colonIndex <= 0) {
      continue;
    }
    const key = rawLine.slice(0, colonIndex).trim().toLowerCase();
    const rawVal = rawLine.slice(colonIndex + 1).trim();
    meta[key] = unescapeHeaderValue(rawVal);
  }

  const title = (meta.title ?? "").trim();
  const content = bodyLines.map(unescapeBodyLine).join("\n");
  if (!title || !content.trim()) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: (meta.id ?? "").trim() || createCustomSnippetId(),
    language: normalizeSnippetLanguage(meta.language),
    categoryId: normalizeSnippetCategory(meta.category ?? meta.categoryid),
    title,
    description: (meta.description ?? "").trim() || undefined,
    content,
    createdAt: (meta.createdat ?? "").trim() || now,
    updatedAt: (meta.updatedat ?? "").trim() || now,
  };
}

export function parseSnippetsFromText(raw: string): CustomSnippet[] {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const hasHeaderMarker = lines.some((line) =>
    line.trim().startsWith(SNIPPETS_TEXT_HEADER_PREFIX),
  );
  const hasBlockMarker = lines.some(
    (line) => line.trim() === SNIPPETS_TEXT_BLOCK_START,
  );

  if (!hasHeaderMarker && !hasBlockMarker) {
    throw new Error("invalid_format");
  }

  const snippets: CustomSnippet[] = [];
  let state: "outside" | "headers" | "body" = "outside";
  let currentHeaders: string[] = [];
  let currentBody: string[] = [];
  let blocksFound = 0;

  for (const line of lines) {
    if (state === "outside") {
      if (line.trim() === SNIPPETS_TEXT_BLOCK_START) {
        state = "headers";
        currentHeaders = [];
        currentBody = [];
        blocksFound += 1;
      }
      continue;
    }

    if (state === "headers") {
      if (line.trim() === SNIPPETS_TEXT_BODY_DIVIDER) {
        state = "body";
        continue;
      }
      if (line.trim() === SNIPPETS_TEXT_BLOCK_END) {
        state = "outside";
        continue;
      }
      currentHeaders.push(line);
      continue;
    }

    if (line === SNIPPETS_TEXT_BLOCK_END) {
      const parsed = parseTextSnippetBlock(currentHeaders, currentBody);
      if (parsed) {
        snippets.push(parsed);
      }
      state = "outside";
      currentHeaders = [];
      currentBody = [];
      continue;
    }

    currentBody.push(line);
  }

  if (state !== "outside") {
    throw new Error("invalid_format");
  }

  if (blocksFound > 0 && snippets.length === 0) {
    throw new Error("invalid_snippets");
  }

  return snippets;
}

export function parseSnippetsExportPayload(raw: string): CustomSnippet[] {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    throw new Error("invalid_format");
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonSnippetsPayload(trimmed);
  }

  return parseSnippetsFromText(raw);
}

export interface SnippetsPanelPosition {
  x: number;
  y: number;
}

export function loadSnippetsPanelPosition(): SnippetsPanelPosition | null {
  return readStorageJson(STORAGE_KEY_SNIPPETS_PANEL_POSITION, (parsed) => {
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (
      typeof record.x !== "number" ||
      typeof record.y !== "number" ||
      !Number.isFinite(record.x) ||
      !Number.isFinite(record.y)
    ) {
      return null;
    }

    return { x: record.x, y: record.y };
  });
}

export function saveSnippetsPanelPosition(position: SnippetsPanelPosition): void {
  writeStorageJson(STORAGE_KEY_SNIPPETS_PANEL_POSITION, position);
}

export function getDefaultSnippetsPanelPosition(
  panelWidth = 420,
  margin = 16,
): SnippetsPanelPosition {
  return {
    x: Math.max(margin, window.innerWidth - panelWidth - margin),
    y: 72,
  };
}

export function clampSnippetsPanelPosition(
  position: SnippetsPanelPosition,
  panelWidth: number,
  panelHeight: number,
  margin = 8,
): SnippetsPanelPosition {
  const maxX = Math.max(margin, window.innerWidth - panelWidth - margin);
  const maxY = Math.max(margin, window.innerHeight - panelHeight - margin);

  return {
    x: Math.min(Math.max(margin, position.x), maxX),
    y: Math.min(Math.max(margin, position.y), maxY),
  };
}
