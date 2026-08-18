import { computed, ref } from "vue";
import type { CodeGraphDiagramType } from "@/constants/code-graph";
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import type { CodeProjectIR, ProjectTreeNode } from "@/services/code-graph/ir/code-project-ir";
import {
  resolveSelectedFileIds,
  resolveSelectedSymbolIds,
} from "@/services/code-graph/ingest/build-project-tree";
import {
  applyDiagramIrEdits,
  generateCodeGraphDiagram,
} from "@/services/code-graph/pipeline/generate-diagram";
import { useCodeGraphGate } from "@/composables/code-graph/useCodeGraphGate";

export interface CodeGraphBatchItem {
  id: string;
  label: string;
  diagramType: CodeGraphDiagramType;
  fileIds: string[];
  symbolIds: string[];
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

export function useCodeAnalysisQueue() {
  const queue = ref<CodeGraphBatchItem[]>([]);
  const isRunning = ref(false);
  const currentIndex = ref(-1);

  function buildBatchItem(
    project: CodeProjectIR,
    tree: ProjectTreeNode,
    diagramType: CodeGraphDiagramType,
  ): CodeGraphBatchItem {
    return {
      id: `${diagramType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `${project.rootName}-${diagramType}`,
      diagramType,
      fileIds: resolveSelectedFileIds(tree),
      symbolIds: resolveSelectedSymbolIds(tree),
      status: "pending",
    };
  }

  async function runQueue(
    project: CodeProjectIR,
    irOverride: DiagramIR | null,
    onResult: (item: CodeGraphBatchItem, result: ReturnType<typeof generateCodeGraphDiagram>) => void,
  ): Promise<void> {
    isRunning.value = true;
    for (let index = 0; index < queue.value.length; index += 1) {
      currentIndex.value = index;
      const item = queue.value[index];
      item.status = "running";

      try {
        const gate = useCodeGraphGate();
        if (!gate.isDiagramTypeAllowed(item.diagramType)) {
          throw new Error("CODE_GRAPH_DIAGRAM_NOT_ALLOWED");
        }

        if (!gate.enforceFileLimit(item.fileIds.length || project.files.length)) {
          throw new Error("CODE_GRAPH_FILE_LIMIT");
        }

        const result = generateCodeGraphDiagram({
          project,
          diagramType: item.diagramType,
          selectedFileIds: item.fileIds,
          selectedSymbolIds: item.symbolIds,
          irOverride: irOverride ?? undefined,
        });
        item.status = "done";
        onResult(item, result);
      } catch (error) {
        item.status = "error";
        item.error = error instanceof Error ? error.message : "CODE_GRAPH_BATCH_FAILED";
      }
    }

    isRunning.value = false;
    currentIndex.value = -1;
  }

  const progressPercent = computed(() => {
    if (queue.value.length === 0) {
      return 0;
    }

    const done = queue.value.filter((item) =>
      item.status === "done" || item.status === "error",
    ).length;
    return Math.round((done / queue.value.length) * 100);
  });

  return {
    queue,
    isRunning,
    currentIndex,
    progressPercent,
    buildBatchItem,
    runQueue,
  };
}

export function useCodeGraphIrReview() {
  const editableIr = ref<DiagramIR | null>(null);
  const edits = ref<Array<{ nodeId: string; label?: string; groupId?: string | null }>>([]);

  function setIr(ir: DiagramIR): void {
    editableIr.value = structuredClone(ir);
    edits.value = [];
  }

  function updateNodeLabel(nodeId: string, label: string): void {
    edits.value.push({ nodeId, label });
    const node = editableIr.value?.nodes.find((entry) => entry.id === nodeId);
    if (node) {
      node.label = label;
    }
  }

  function applyEdits(): DiagramIR | null {
    if (!editableIr.value) {
      return null;
    }

    return applyDiagramIrEdits(editableIr.value, edits.value);
  }

  return {
    editableIr,
    setIr,
    updateNodeLabel,
    applyEdits,
  };
}
