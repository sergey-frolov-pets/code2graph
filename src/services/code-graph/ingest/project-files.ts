import type { CodeFileEntry } from "@/services/code-graph/ir/code-project-ir";
import {
  detectLanguageFromPath,
  isSupportedSourcePath,
  shouldExcludePath,
} from "@/services/code-graph/ingest/exclude-patterns";

export interface RawProjectFile {
  relativePath: string;
  content: string;
}

let fileIdCounter = 0;

export function resetProjectFileIdCounter(): void {
  fileIdCounter = 0;
}

function createFileId(): string {
  fileIdCounter += 1;
  return `file-${fileIdCounter}`;
}

export function rawFilesToCodeEntries(
  files: RawProjectFile[],
  includeAllForFolder = false,
): CodeFileEntry[] {
  const entries: CodeFileEntry[] = [];

  for (const file of files) {
    const relativePath = file.relativePath.replace(/\\/g, "/");
    if (shouldExcludePath(relativePath)) {
      continue;
    }

    if (!includeAllForFolder && !isSupportedSourcePath(relativePath)) {
      continue;
    }

    const language = detectLanguageFromPath(relativePath);
    if (!language && !includeAllForFolder) {
      continue;
    }

    entries.push({
      id: createFileId(),
      path: relativePath,
      relativePath,
      language: language ?? "unknown",
      content: file.content,
    });
  }

  return entries.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

export function filterEntriesForDiagramType(
  entries: CodeFileEntry[],
  diagramType: string,
): CodeFileEntry[] {
  if (diagramType === "folder") {
    return entries;
  }

  return entries.filter((entry) => isSupportedSourcePath(entry.relativePath));
}
