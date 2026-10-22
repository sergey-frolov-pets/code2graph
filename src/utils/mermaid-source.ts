import { detectDiagramFormatFromSource } from "@/utils/diagram-format";

const PLANTUML_BLOCK_START_PATTERN =
  /@start(uml|gantt|mindmap|wbs|json|yaml|ditaa|salt|dot|chen|nwdiag|chronology|ebnf|regex|board|math|latex)\b/i;

export function extractLeadingMermaidDiagram(source: string): string {
  const plantUmlStart = source.search(PLANTUML_BLOCK_START_PATTERN);

  // Trailing spaces and blank lines are part of the text being typed.
  if (plantUmlStart <= 0) {
    return source;
  }

  const leading = source.slice(0, plantUmlStart).trim();
  if (!leading) {
    return source;
  }

  if (detectDiagramFormatFromSource(leading) === "mermaid") {
    return leading;
  }

  return source;
}

export function isCompleteMermaidDiagram(source: string): boolean {
  const prepared = extractLeadingMermaidDiagram(source.trim());
  return detectDiagramFormatFromSource(prepared) === "mermaid";
}

export function prepareMermaidSource(source: string): string {
  const trimmed = source.trim();
  const fencedMatch = trimmed.match(/^```(?:mermaid)?\s*\n([\s\S]*?)```$/i);
  if (fencedMatch) {
    return extractLeadingMermaidDiagram(fencedMatch[1].trim());
  }

  return extractLeadingMermaidDiagram(trimmed);
}
