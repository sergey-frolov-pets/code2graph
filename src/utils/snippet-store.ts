import type { CustomSnippet } from "@/types/snippets";

export const STORAGE_KEY_CUSTOM_SNIPPETS = "plantuml-smetana-custom-snippets";

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
