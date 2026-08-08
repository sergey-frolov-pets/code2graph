import { ref } from "vue";
import type { DiagramIR } from "@/services/conversion/diagram-ir";

const lastDiagramIr = ref<DiagramIR | null>(null);

export function useDiagramIrCache() {
  function setLastDiagramIr(ir: DiagramIR | null): void {
    lastDiagramIr.value = ir;
  }

  function getLastDiagramIr(): DiagramIR | null {
    return lastDiagramIr.value;
  }

  return {
    lastDiagramIr,
    setLastDiagramIr,
    getLastDiagramIr,
  };
}
