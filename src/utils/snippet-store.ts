import type { CustomSnippet } from "@/types/snippets";

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
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_SNIPPETS);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCustomSnippet);
  } catch {
    return [];
  }
}

export function saveCustomSnippets(snippets: CustomSnippet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_SNIPPETS, JSON.stringify(snippets));
  } catch {
    // file:// может блокировать localStorage
  }
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SNIPPETS_PANEL_POSITION);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
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
  } catch {
    return null;
  }
}

export function saveSnippetsPanelPosition(position: SnippetsPanelPosition): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_SNIPPETS_PANEL_POSITION,
      JSON.stringify(position),
    );
  } catch {
    // file:// может блокировать localStorage
  }
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
