export const MAX_PUML_FILE_BYTES = 512_000;

export const DIAGRAM_LANGUAGES = [
  "plantuml",
  "mermaid",
  "graphviz",
  "ditaa",
  "other",
] as const;

export type DiagramLanguage = (typeof DIAGRAM_LANGUAGES)[number];

export function isDiagramLanguage(value: string): value is DiagramLanguage {
  return (DIAGRAM_LANGUAGES as readonly string[]).includes(value);
}

export const LIBRARY_SEARCH_DEBOUNCE_MS = 300;

export const LIBRARY_CACHE_KEY = "plantuml-smetana-library-synced-at";

export const STORAGE_KEY_LIBRARY_API_URL = "plantuml-smetana-library-api-url";

export interface SectionDto {
  id: string;
  parentId: string | null;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: SectionDto[];
}

export interface DiagramListItemDto {
  id: string;
  sectionId: string | null;
  title: string;
  description: string;
  tags: string[];
  language: DiagramLanguage;
  fileName: string;
  byteSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramDto extends DiagramListItemDto {
  source: string;
}

export interface CreateDiagramPayload {
  title: string;
  description: string;
  tags: string[];
  language: DiagramLanguage;
  sectionId: string | null;
  source: string;
  fileName: string;
}

export interface CreateSectionPayload {
  title: string;
  parentId: string | null;
  sortOrder?: number;
}

export interface UpdateDiagramPayload {
  title?: string;
  description?: string;
  tags?: string[];
  sectionId?: string | null;
  source?: string;
  fileName?: string;
}

export const LIBRARY_EXPORT_VERSION = 1;

export interface LibraryExportBundle {
  version: typeof LIBRARY_EXPORT_VERSION;
  exportedAt: string;
  sections: SectionDto[];
  diagrams: DiagramDto[];
}
