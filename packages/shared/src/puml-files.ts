export const PUML_EXTENSIONS = [".puml", ".plantuml", ".txt"] as const;

export const MERMAID_EXTENSIONS = [".mmd", ".mermaid"] as const;

export const GRAPHML_EXTENSIONS = [".graphml"] as const;

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

export function resolvePumlFileName(fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  if (isPumlFileName(sanitized)) {
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
  return "plantuml";
}
