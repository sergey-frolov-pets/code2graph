import { looksLikeD2Source } from "./d2-source.js";
import { looksLikeStructurizrSource } from "./structurizr-source.js";

export const PUML_EXTENSIONS = [".puml", ".plantuml", ".txt"] as const;

export const MERMAID_EXTENSIONS = [".mmd", ".mermaid"] as const;

export const GRAPHML_EXTENSIONS = [".graphml"] as const;

export const WIREMARK_EXTENSIONS = [".wiremark"] as const;

export const D2_EXTENSIONS = [".d2"] as const;

export const STRUCTURIZR_EXTENSIONS = [".structurizr", ".dsl"] as const;

const KNOWN_DIAGRAM_EXTENSIONS = [
  ...PUML_EXTENSIONS,
  ...MERMAID_EXTENSIONS,
  ...GRAPHML_EXTENSIONS,
  ...WIREMARK_EXTENSIONS,
  ...D2_EXTENSIONS,
  ...STRUCTURIZR_EXTENSIONS,
] as const;

const DIAGRAM_TITLE_EXTENSION =
  /\.(puml|plantuml|txt|mmd|mermaid|graphml|wiremark|d2|structurizr|dsl)$/i;

export function isPumlFileName(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return PUML_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "diagram.puml";
  }

  return trimmed.replace(/[\\/:*?"<>|]+/g, "_");
}

export function hasKnownDiagramExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return KNOWN_DIAGRAM_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );
}

export function stripDiagramTitleExtension(fileName: string): string {
  return fileName.replace(DIAGRAM_TITLE_EXTENSION, "");
}

export function resolvePumlFileName(fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  if (hasKnownDiagramExtension(sanitized)) {
    return sanitized;
  }

  const withoutExtension = sanitized.replace(/\.[^.]+$/, "");
  return `${withoutExtension || "diagram"}.puml`;
}

export function detectLanguageFromFileName(fileName: string): string | null {
  const lowerName = fileName.toLowerCase();
  if (MERMAID_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return "mermaid";
  }
  if (GRAPHML_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return "graphml";
  }
  if (WIREMARK_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return "wiremark";
  }
  if (D2_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return "d2";
  }
  if (STRUCTURIZR_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return "structurizr";
  }
  if (isPumlFileName(fileName)) {
    return "plantuml";
  }
  return null;
}

export function detectLanguageFromSource(source: string): string {
  const trimmed = source.trim().toLowerCase();
  if (
    trimmed.startsWith("<?xml") &&
    (trimmed.includes("<graphml") || trimmed.includes(":graphml"))
  ) {
    return "graphml";
  }
  if (trimmed.includes("@startuml") || trimmed.includes("@enduml")) {
    return "plantuml";
  }
  if (trimmed.startsWith("graph ") || trimmed.startsWith("digraph ")) {
    return "graphviz";
  }
  if (
    trimmed.startsWith("```mermaid") ||
    trimmed.includes("sequencediagram") ||
    /^(graph|flowchart|classdiagram|statediagram|erdiagram)\b/.test(trimmed)
  ) {
    return "mermaid";
  }
  if (
    trimmed.startsWith("```wireframe") ||
    trimmed.startsWith("```wiremark") ||
    trimmed.startsWith("wireframe ") ||
    trimmed.startsWith("flow ")
  ) {
    return "wiremark";
  }
  if (looksLikeStructurizrSource(source)) {
    return "structurizr";
  }
  if (looksLikeD2Source(source)) {
    return "d2";
  }
  return "plantuml";
}
