import { computed, ref } from "vue";
import type { CodeGraphDiagramType } from "@/constants/code-graph";
import {
  CODE_GRAPH_DIAGRAM_TYPES,
  CODE_GRAPH_FREE_MAX_FILES,
  CODE_GRAPH_PRO_MAX_FILES,
  CODE_GRAPH_PRO_SKU,
  CODE_GRAPH_SUBSCRIPTION_STORAGE_KEY,
} from "@/constants/code-graph";
import { readStorageItem, writeStorageItem } from "@/core/safe-storage";

export type CodeGraphAccessLevel = "free" | "pro";

export interface CodeGraphLimits {
  maxFiles: number;
  allowedDiagramTypes: CodeGraphDiagramType[];
  batchEnabled: boolean;
  githubEnabled: boolean;
  hybridLlmEnabled: boolean;
  irReviewEnabled: boolean;
}

const FREE_DIAGRAM_TYPES: CodeGraphDiagramType[] = ["folder", "class"];
const PRO_DIAGRAM_TYPES: CodeGraphDiagramType[] = [...CODE_GRAPH_DIAGRAM_TYPES];

export function readCodeGraphProSubscription(): boolean {
  return readStorageItem(CODE_GRAPH_SUBSCRIPTION_STORAGE_KEY) === "active";
}

export function writeCodeGraphProSubscription(active: boolean): void {
  writeStorageItem(
    CODE_GRAPH_SUBSCRIPTION_STORAGE_KEY,
    active ? "active" : "",
  );
}

export function resolveCodeGraphAccessLevel(): CodeGraphAccessLevel {
  return readCodeGraphProSubscription() ? "pro" : "free";
}

export function getCodeGraphLimits(level: CodeGraphAccessLevel): CodeGraphLimits {
  if (level === "pro") {
    return {
      maxFiles: CODE_GRAPH_PRO_MAX_FILES,
      allowedDiagramTypes: PRO_DIAGRAM_TYPES,
      batchEnabled: true,
      githubEnabled: true,
      hybridLlmEnabled: true,
      irReviewEnabled: true,
    };
  }

  return {
    maxFiles: CODE_GRAPH_FREE_MAX_FILES,
    allowedDiagramTypes: FREE_DIAGRAM_TYPES,
    batchEnabled: false,
    githubEnabled: false,
    hybridLlmEnabled: false,
    irReviewEnabled: true,
  };
}

export function isDiagramTypeAllowed(
  diagramType: CodeGraphDiagramType,
  level: CodeGraphAccessLevel,
): boolean {
  return getCodeGraphLimits(level).allowedDiagramTypes.includes(diagramType);
}

export function enforceFileLimit(
  selectedFileCount: number,
  level: CodeGraphAccessLevel,
): boolean {
  return selectedFileCount <= getCodeGraphLimits(level).maxFiles;
}

export function useCodeGraphGate() {
  const accessLevel = ref<CodeGraphAccessLevel>(resolveCodeGraphAccessLevel());
  const limits = computed(() => getCodeGraphLimits(accessLevel.value));

  function refreshAccess(): void {
    accessLevel.value = resolveCodeGraphAccessLevel();
  }

  function activateProSubscription(): void {
    writeCodeGraphProSubscription(true);
    refreshAccess();
  }

  return {
    accessLevel,
    limits,
    proSku: CODE_GRAPH_PRO_SKU,
    refreshAccess,
    activateProSubscription,
    isDiagramTypeAllowed: (diagramType: CodeGraphDiagramType) =>
      isDiagramTypeAllowed(diagramType, accessLevel.value),
    enforceFileLimit: (count: number) =>
      enforceFileLimit(count, accessLevel.value),
  };
}
