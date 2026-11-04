import type { DiagramEdge, DiagramIR } from "@/services/conversion/diagram-ir";

export function addEdge(
  ir: DiagramIR,
  source: string,
  target: string,
  label?: string,
  kind?: DiagramEdge["kind"],
  semantic?: Record<string, unknown>,
): void {
  ir.edges.push({
    id: `e${ir.edges.length + 1}`,
    source,
    target,
    label,
    kind,
    semantic,
    matchConfidence: 1,
  });
}

export function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').trim();
  }
  return trimmed;
}
