import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { buildHierarchy } from "@/services/conversion/graph/graph-analysis";

const DEFAULT_HIERARCHY_ROOT_LABEL = "Diagram";

export function resolveHierarchyItems(ir: DiagramIR): Array<{ level: number; label: string }> {
  const wbsItems = ir.extras?.wbsItems;
  if (wbsItems && wbsItems.length > 0) {
    return wbsItems;
  }
  const rootLabel = ir.extras?.title || DEFAULT_HIERARCHY_ROOT_LABEL;
  return buildHierarchy(ir, rootLabel).items;
}

export function wrapPlantUml(body: string): string {
  return `@startuml\n!pragma layout smetana\n\n${body}\n@enduml`;
}
