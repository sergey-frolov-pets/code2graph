import {
  detectFormatFromFileName,
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import { MAX_PUML_FILE_BYTES } from "@/constants/diagram-library";
import { downloadTextFile } from "@/utils/export";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { readFileAsText } from "@/utils/puml-files";

export { readFileAsText };

export function assertDiagramFileSize(
  file: File,
  maxBytes = MAX_PUML_FILE_BYTES,
): void {
  if (file.size > maxBytes) {
    const maxKb = Math.round(maxBytes / 1024);
    throw new LocalizedAppError("file.tooLarge", { size: maxKb });
  }
}

export async function loadDiagramFromFile(file: File): Promise<{
  content: string;
  fileName: string;
  format: DiagramFormat;
}> {
  assertDiagramFileSize(file);
  const content = await readFileAsText(file);
  if (!content.trim()) {
    throw new LocalizedAppError("file.empty");
  }

  const format =
    detectFormatFromFileName(file.name) ??
    getDiagramFormatDefinition("plantuml").id;

  return {
    content,
    fileName: sanitizeDiagramFileName(file.name, format),
    format,
  };
}

export function sanitizeDiagramFileName(
  fileName: string,
  format: DiagramFormat,
): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return getDiagramFormatDefinition(format).defaultFileName;
  }

  return trimmed.replace(/[\\/:*?"<>|]+/g, "_");
}

export function resolveDiagramFileName(
  fileName: string,
  format: DiagramFormat,
): string {
  const definition = getDiagramFormatDefinition(format);
  const sanitized = sanitizeDiagramFileName(fileName, format);
  const lowerName = sanitized.toLowerCase();

  if (definition.extensions.some((extension) => lowerName.endsWith(extension))) {
    return sanitized;
  }

  const withoutExtension = sanitized.replace(/\.[^.]+$/, "");
  const baseName = withoutExtension || "diagram";
  return `${baseName}${definition.extensions[0]}`;
}

export function saveDiagramSource(
  source: string,
  fileName: string,
  format: DiagramFormat,
): void {
  const definition = getDiagramFormatDefinition(format);
  downloadTextFile(
    source,
    resolveDiagramFileName(fileName, format),
    definition.mimeType,
  );
}
