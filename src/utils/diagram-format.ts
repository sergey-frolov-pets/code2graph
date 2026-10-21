import type { DiagramLanguage } from "@/constants/diagram-library";
import { isDiagramFormat, type DiagramFormat } from "@/constants/diagram-format-ids";
import {
  detectFormatFromFileName,
  detectRegisteredDiagramSource,
} from "@/languages/registry";

export function detectDiagramFormatFromSource(source: string): DiagramFormat | null {
  return detectRegisteredDiagramSource(source);
}

export function resolveLibraryDiagramFormat(
  source: string,
  fileName?: string,
  language?: DiagramLanguage,
): DiagramFormat {
  if (source.trim()) {
    return detectDiagramFormat(source, fileName);
  }

  if (language && isDiagramFormat(language)) {
    return language;
  }

  return detectDiagramFormat(source, fileName);
}

export function detectDiagramFormat(
  source: string,
  fileName?: string,
): DiagramFormat {
  const fromSource = detectDiagramFormatFromSource(source);
  if (fromSource) {
    return fromSource;
  }

  const fromFileName = fileName ? detectFormatFromFileName(fileName) : null;
  if (fromFileName) {
    return fromFileName;
  }

  return "plantuml";
}
