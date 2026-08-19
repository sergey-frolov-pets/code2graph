import type { CodeGraphDiagramType } from "@/constants/code-graph";
import type { CodeProjectIR } from "@/services/code-graph/ir/code-project-ir";
import {
  filterEntriesForDiagramType,
  rawFilesToCodeEntries,
  resetProjectFileIdCounter,
  type RawProjectFile,
} from "@/services/code-graph/ingest/project-files";
import { getLanguagePluginForPath } from "@/services/code-graph/languages/registry";
import { resetLanguageParseCounters } from "@/services/code-graph/languages/types";
import { createEmptyCodeProjectIR } from "@/services/code-graph/ir/code-project-ir";

export interface AnalyzeProjectOptions {
  rootName: string;
  sourceKind: CodeProjectIR["sourceKind"];
  files: RawProjectFile[];
  diagramType?: CodeGraphDiagramType;
  onProgress?: (completed: number, total: number, path: string) => void;
}

export async function analyzeProject(
  options: AnalyzeProjectOptions,
): Promise<CodeProjectIR> {
  resetProjectFileIdCounter();
  resetLanguageParseCounters();

  const includeAllForFolder = options.diagramType === "folder";
  const entries = rawFilesToCodeEntries(options.files, includeAllForFolder);
  const filtered = options.diagramType
    ? filterEntriesForDiagramType(entries, options.diagramType)
    : entries;

  const project = createEmptyCodeProjectIR(options.rootName, options.sourceKind);
  project.files = filtered;

  const languages = new Set<string>();
  let completed = 0;

  for (const file of filtered) {
    const plugin = getLanguagePluginForPath(file.relativePath);
    if (!plugin) {
      completed += 1;
      options.onProgress?.(completed, filtered.length, file.relativePath);
      continue;
    }

    languages.add(plugin.id);
    const parsed = plugin.parseFile(file);
    project.symbols.push(...parsed.symbols);
    project.imports.push(...parsed.imports);
    project.calls.push(...parsed.calls);
    project.notes.push(...parsed.notes);
    project.flows.push(...parsed.flows);
    completed += 1;
    options.onProgress?.(completed, filtered.length, file.relativePath);
  }

  project.metadata.languages = [...languages];
  project.metadata.parsedAt = new Date().toISOString();
  return project;
}
