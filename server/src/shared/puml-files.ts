const PUML_EXTENSIONS = [".puml", ".plantuml", ".txt"];

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

export function detectLanguageFromSource(source: string): string {
  const trimmed = source.trim().toLowerCase();
  if (trimmed.includes("@startuml") || trimmed.includes("@enduml")) {
    return "plantuml";
  }
  if (trimmed.startsWith("graph ") || trimmed.startsWith("digraph ")) {
    return "graphviz";
  }
  if (trimmed.startsWith("```mermaid") || trimmed.includes("sequencediagram")) {
    return "mermaid";
  }
  return "plantuml";
}
