import type { CustomSnippet } from "@/types/snippets";
import {
  readStorageJson,
  writeStorageJson,
} from "@/utils/safe-storage";

export const STORAGE_KEY_CUSTOM_SNIPPETS = "plantuml-smetana-custom-snippets";
export const STORAGE_KEY_SNIPPETS_PANEL_POSITION =
  "plantuml-smetana-snippets-panel-position";

export const SNIPPETS_EXPORT_VERSION = 1;
export const SNIPPETS_EXPORT_FILE_NAME = "plantuml-snippets.json";
export const SNIPPETS_IMPORT_ACCEPT = "application/json,.json";

export interface SnippetsExportPayload {
  version: number;
  exportedAt: string;
  snippets: CustomSnippet[];
}

function isCustomSnippet(value: unknown): value is CustomSnippet {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.content === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

export function loadCustomSnippets(): CustomSnippet[] {
  return (
    readStorageJson(STORAGE_KEY_CUSTOM_SNIPPETS, (parsed) => {
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed.filter(isCustomSnippet);
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

export function parseSnippetsExportPayload(raw: string): CustomSnippet[] {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return parsed.filter(isCustomSnippet);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_format");
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.snippets)) {
    throw new Error("invalid_format");
  }

  const snippets = record.snippets.filter(isCustomSnippet);
  if (snippets.length === 0 && record.snippets.length > 0) {
    throw new Error("invalid_snippets");
  }

  return snippets;
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
