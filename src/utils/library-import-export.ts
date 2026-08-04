import {
  LIBRARY_EXPORT_VERSION,
  type DiagramDto,
  type LibraryExportBundle,
  type SectionDto,
} from "@/constants/diagram-library";
import {
  loadAllDiagramDetailsFromCache,
  loadSectionsFromCache,
} from "@/utils/diagram-store";
import { downloadTextFile } from "@/utils/export";

const EXPORT_FILE_NAME = "vueplantuml-library.json";
const EXPORT_MIME_TYPE = "application/json;charset=utf-8";

export async function buildLocalExportBundle(
  sectionIds: ReadonlySet<string>,
  diagramIds: ReadonlySet<string>,
): Promise<LibraryExportBundle> {
  const [sections, diagrams] = await Promise.all([
    loadSectionsFromCache(),
    loadAllDiagramDetailsFromCache(),
  ]);

  return {
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sections: sections.filter((section) => sectionIds.has(section.id)),
    diagrams: diagrams.filter((diagram) => diagramIds.has(diagram.id)),
  };
}

export function downloadLibraryBundle(bundle: LibraryExportBundle): void {
  const content = JSON.stringify(bundle, null, 2);
  downloadTextFile(content, EXPORT_FILE_NAME, EXPORT_MIME_TYPE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSection(value: unknown): SectionDto | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, parentId, title, sortOrder, createdAt, updatedAt } = value;
  if (
    typeof id !== "string" ||
    (parentId !== null && typeof parentId !== "string") ||
    typeof title !== "string" ||
    typeof sortOrder !== "number" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    parentId,
    title,
    sortOrder,
    createdAt,
    updatedAt,
  };
}

function parseDiagram(value: unknown): DiagramDto | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    id,
    sectionId,
    title,
    description,
    tags,
    language,
    source,
    fileName,
    byteSize,
    createdAt,
    updatedAt,
  } = value;

  if (
    typeof id !== "string" ||
    (sectionId !== null && typeof sectionId !== "string") ||
    typeof title !== "string" ||
    typeof description !== "string" ||
    !Array.isArray(tags) ||
    !tags.every((tag) => typeof tag === "string") ||
    typeof language !== "string" ||
    typeof source !== "string" ||
    typeof fileName !== "string" ||
    typeof byteSize !== "number" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id,
    sectionId,
    title,
    description,
    tags,
    language: language as DiagramDto["language"],
    source,
    fileName,
    byteSize,
    createdAt,
    updatedAt,
  };
}

export function parseLibraryImportFile(content: string): LibraryExportBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON file");
  }

  if (!isRecord(parsed) || parsed.version !== LIBRARY_EXPORT_VERSION) {
    throw new Error("Unsupported library export format");
  }

  if (
    typeof parsed.exportedAt !== "string" ||
    !Array.isArray(parsed.sections) ||
    !Array.isArray(parsed.diagrams)
  ) {
    throw new Error("Invalid library export structure");
  }

  const sections = parsed.sections
    .map(parseSection)
    .filter((section): section is SectionDto => section !== null);
  const diagrams = parsed.diagrams
    .map(parseDiagram)
    .filter((diagram): diagram is DiagramDto => diagram !== null);

  if (sections.length === 0 && diagrams.length === 0) {
    throw new Error("Library export file is empty");
  }

  return {
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: parsed.exportedAt,
    sections,
    diagrams,
  };
}
