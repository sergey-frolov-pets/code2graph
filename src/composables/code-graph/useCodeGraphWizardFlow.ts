import { computed, ref, watch, type Ref } from "vue";
import type { TranslateFn } from "@/locales/types";
import type { CodeGraphDiagramType } from "@/constants/code-graph";
import { CODE_GRAPH_DIAGRAM_TYPES } from "@/constants/code-graph";
import { useCodeAnalysisQueue, useCodeGraphIrReview } from "@/composables/code-graph/useCodeAnalysisQueue";
import { useCodeGraphGate } from "@/composables/code-graph/useCodeGraphGate";
import { useCodeProjectIngest } from "@/composables/code-graph/useCodeProjectIngest";
import {
  resolveSelectedFileIds,
  resolveSelectedSymbolIds,
  setTreeNodeChecked,
} from "@/services/code-graph/ingest/build-project-tree";
import { generateCodeGraphDiagram } from "@/services/code-graph/pipeline/generate-diagram";
import { refineCodeGraphIrWithLlm } from "@/services/code-graph/pipeline/hybrid-llm-refine";
import { readStorageItem, writeStorageItem } from "@/core/safe-storage";
import { CODE_GRAPH_GITHUB_TOKEN_STORAGE_KEY } from "@/constants/code-graph";
import { renderPlantUmlPreviewSvg } from "@/utils/llm-preview";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";

export interface UseCodeGraphWizardFlowOptions {
  open: Ref<boolean>;
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
  t: TranslateFn;
  onApplyNewTab: (payload: { source: string; label: string }) => void;
  onClose: () => void;
}

export function useCodeGraphWizardFlow(options: UseCodeGraphWizardFlowOptions) {
  const ingest = useCodeProjectIngest();
  const gate = useCodeGraphGate();
  const irReview = useCodeGraphIrReview();
  const batch = useCodeAnalysisQueue();

  const selectedDiagramType = ref<CodeGraphDiagramType>("folder");
  const githubUrl = ref("");
  const sourceTab = ref<"zip" | "folder" | "github">("zip");
  const errorMessage = ref("");
  const resultSource = ref("");
  const previewSvg = ref("");
  const isPreviewLoading = ref(false);
  const useHybridLlm = ref(false);

  ingest.githubToken.value = readStorageItem(CODE_GRAPH_GITHUB_TOKEN_STORAGE_KEY) ?? "";

  watch(
    () => ingest.githubToken.value,
    (token) => {
      writeStorageItem(CODE_GRAPH_GITHUB_TOKEN_STORAGE_KEY, token);
    },
  );

  const diagramTypeOptions = computed(() =>
    CODE_GRAPH_DIAGRAM_TYPES.map((id) => ({
      id,
      allowed: gate.isDiagramTypeAllowed(id),
      label: options.t(`codeGraph.diagramType.${id}`),
      description: options.t(`codeGraph.diagramTypeDesc.${id}`),
    })),
  );

  async function handleZipUpload(file: File): Promise<void> {
    errorMessage.value = "";
    await ingest.ingestZip(file);
  }

  async function handleFolderPicker(): Promise<void> {
    errorMessage.value = "";
    await ingest.ingestFolderFromPicker();
  }

  async function handleFolderInput(fileList: FileList): Promise<void> {
    errorMessage.value = "";
    await ingest.ingestFolderFromInput(fileList);
  }

  async function handleGitHubLoad(): Promise<void> {
    errorMessage.value = "";
    if (!gate.limits.value.githubEnabled) {
      errorMessage.value = "CODE_GRAPH_GITHUB_PRO_ONLY";
      return;
    }

    await ingest.ingestGitHub(githubUrl.value, ingest.githubToken.value);
  }

  function toggleTreeNode(nodeId: string, checked: boolean): void {
    if (!ingest.projectTree.value) {
      return;
    }

    setTreeNodeChecked(ingest.projectTree.value, nodeId, checked);
  }

  async function previewCurrentSelection(): Promise<void> {
    if (!ingest.project.value || !ingest.projectTree.value) {
      return;
    }

    const fileIds = resolveSelectedFileIds(ingest.projectTree.value);
    const symbolIds = resolveSelectedSymbolIds(ingest.projectTree.value);

    if (!gate.enforceFileLimit(fileIds.length || ingest.project.value.files.length)) {
      errorMessage.value = "CODE_GRAPH_FILE_LIMIT";
      return;
    }

    if (!gate.isDiagramTypeAllowed(selectedDiagramType.value)) {
      errorMessage.value = "CODE_GRAPH_DIAGRAM_NOT_ALLOWED";
      return;
    }

    let result = generateCodeGraphDiagram({
      project: ingest.project.value,
      diagramType: selectedDiagramType.value,
      selectedFileIds: fileIds,
      selectedSymbolIds: symbolIds,
    });

    if (
      useHybridLlm.value &&
      gate.limits.value.hybridLlmEnabled &&
      selectedDiagramType.value === "flow"
    ) {
      const refinedIr = await refineCodeGraphIrWithLlm(
        result.ir,
        `${ingest.project.value.rootName}; files=${ingest.project.value.files.length}`,
      );
      result = generateCodeGraphDiagram({
        project: ingest.project.value,
        diagramType: selectedDiagramType.value,
        selectedFileIds: fileIds,
        selectedSymbolIds: symbolIds,
        irOverride: refinedIr,
      });
    }

    irReview.setIr(result.ir);
    resultSource.value = result.plantUml;
    isPreviewLoading.value = true;

    try {
      previewSvg.value = await renderPlantUmlPreviewSvg(
        result.plantUml,
        options.layout.value,
        options.diagramDarkMode.value,
        options.renderMode.value,
      );
    } finally {
      isPreviewLoading.value = false;
    }
  }

  function addCurrentToBatch(): void {
    if (!ingest.project.value || !ingest.projectTree.value) {
      return;
    }

    if (!gate.limits.value.batchEnabled) {
      errorMessage.value = "CODE_GRAPH_BATCH_PRO_ONLY";
      return;
    }

    batch.queue.value.push(
      batch.buildBatchItem(
        ingest.project.value,
        ingest.projectTree.value,
        selectedDiagramType.value,
      ),
    );
  }

  async function runBatchGeneration(): Promise<void> {
    if (!ingest.project.value) {
      return;
    }

    const irOverride = irReview.applyEdits();
    await batch.runQueue(ingest.project.value, irOverride, (item, result) => {
      options.onApplyNewTab({
        source: result.plantUml,
        label: item.label,
      });
    });
  }

  function applySingleResult(): void {
    if (!resultSource.value.trim()) {
      return;
    }

    options.onApplyNewTab({
      source: resultSource.value,
      label: `${ingest.project.value?.rootName ?? "code"}-${selectedDiagramType.value}`,
    });
    options.onClose();
  }

  function closeProjectSession(): void {
    ingest.closeProject();
    batch.queue.value = [];
    irReview.editableIr.value = null;
    resultSource.value = "";
    previewSvg.value = "";
  }

  watch(options.open, (isOpen) => {
    if (!isOpen) {
      closeProjectSession();
      errorMessage.value = "";
      selectedDiagramType.value = "folder";
      githubUrl.value = "";
      sourceTab.value = "zip";
    }
  });

  return {
    ingest,
    gate,
    irReview,
    batch,
    selectedDiagramType,
    githubUrl,
    sourceTab,
    errorMessage,
    resultSource,
    previewSvg,
    isPreviewLoading,
    useHybridLlm,
    diagramTypeOptions,
    handleZipUpload,
    handleFolderPicker,
    handleFolderInput,
    handleGitHubLoad,
    toggleTreeNode,
    previewCurrentSelection,
    addCurrentToBatch,
    runBatchGeneration,
    applySingleResult,
    closeProjectSession,
  };
}
