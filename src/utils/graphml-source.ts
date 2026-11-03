import { detectDiagramFormatFromSource } from "@/utils/diagram-format";

export function isCompleteGraphmlDocument(source: string): boolean {
  const trimmed = source.trim();
  if (detectDiagramFormatFromSource(trimmed) !== "graphml") {
    return false;
  }

  const lower = trimmed.toLowerCase();
  return lower.includes("</graphml>") || /<graphml\b[^>]*\/>/i.test(trimmed);
}
