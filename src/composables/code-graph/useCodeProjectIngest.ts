import { ref } from "vue";
import type { CodeGraphDiagramType, CodeGraphSourceKind } from "@/constants/code-graph";
import type { CodeProjectIR, ProjectTreeNode } from "@/services/code-graph/ir/code-project-ir";
import { extractProjectFromZip } from "@/services/code-graph/ingest/unzip-project";
import {
  pickLocalProjectFolder,
  readProjectFromFileList,
} from "@/services/code-graph/ingest/read-local-folder";
import { fetchGitHubProject } from "@/services/code-graph/ingest/fetch-github-project";
import { analyzeProject } from "@/services/code-graph/pipeline/analyze-project";
import { buildProjectTree } from "@/services/code-graph/ingest/build-project-tree";

export function useCodeProjectIngest() {
  const isLoading = ref(false);
  const errorMessage = ref("");
  const progress = ref({ completed: 0, total: 0, currentPath: "" });
  const project = ref<CodeProjectIR | null>(null);
  const projectTree = ref<ProjectTreeNode | null>(null);
  const sourceKind = ref<CodeGraphSourceKind>("zip");
  const githubToken = ref("");

  async function ingestZip(file: File): Promise<void> {
    isLoading.value = true;
    errorMessage.value = "";
    try {
      const buffer = await file.arrayBuffer();
      const extracted = extractProjectFromZip(buffer, file.name);
      sourceKind.value = "zip";
      await analyzeIngestedProject(extracted.rootName, "zip", extracted.files);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "CODE_GRAPH_INGEST_FAILED";
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function ingestFolderFromPicker(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = "";
    try {
      const picked = await pickLocalProjectFolder();
      sourceKind.value = "folder";
      await analyzeIngestedProject(picked.rootName, "folder", picked.files);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "CODE_GRAPH_INGEST_FAILED";
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function ingestFolderFromInput(fileList: FileList): Promise<void> {
    isLoading.value = true;
    errorMessage.value = "";
    try {
      const picked = await readProjectFromFileList(fileList);
      sourceKind.value = "folder";
      await analyzeIngestedProject(picked.rootName, "folder", picked.files);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "CODE_GRAPH_INGEST_FAILED";
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function ingestGitHub(url: string, token?: string): Promise<void> {
    isLoading.value = true;
    errorMessage.value = "";
    try {
      const fetched = await fetchGitHubProject(
        url,
        token,
        (completed, total) => {
          progress.value = {
            completed,
            total,
            currentPath: `${completed}/${total}`,
          };
        },
      );
      sourceKind.value = "github";
      await analyzeIngestedProject(fetched.rootName, "github", fetched.files);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "CODE_GRAPH_GITHUB_FAILED";
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function analyzeIngestedProject(
    rootName: string,
    kind: CodeGraphSourceKind,
    files: Array<{ relativePath: string; content: string }>,
    diagramType?: CodeGraphDiagramType,
  ): Promise<void> {
    progress.value = { completed: 0, total: files.length, currentPath: "" };
    project.value = await analyzeProject({
      rootName,
      sourceKind: kind,
      files,
      diagramType,
      onProgress: (completed, total, currentPath) => {
        progress.value = { completed, total, currentPath };
      },
    });
    projectTree.value = buildProjectTree(project.value);
  }

  function closeProject(): void {
    project.value = null;
    projectTree.value = null;
    progress.value = { completed: 0, total: 0, currentPath: "" };
    errorMessage.value = "";
  }

  return {
    isLoading,
    errorMessage,
    progress,
    project,
    projectTree,
    sourceKind,
    githubToken,
    ingestZip,
    ingestFolderFromPicker,
    ingestFolderFromInput,
    ingestGitHub,
    closeProject,
  };
}
