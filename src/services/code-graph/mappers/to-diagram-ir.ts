import type { CodeGraphDiagramType } from "@/constants/code-graph";
import type { CodeProjectIR } from "@/services/code-graph/ir/code-project-ir";
import {
  createEmptyDiagramIR,
  type DiagramDirection,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramIR,
  type DiagramKind,
  type DiagramNode,
} from "@/services/conversion/diagram-ir";
import { sanitizeDiagramId } from "@/services/conversion/diagram-ir";

function createCodeGraphIr(
  kind: DiagramKind,
  direction: DiagramDirection = "TB",
): DiagramIR {
  return {
    ...createEmptyDiagramIR(kind),
    direction,
    metadata: {
      sourceFormat: "plantuml",
      convertedAt: new Date().toISOString(),
      conversionMode: "source",
    },
  };
}

function notesForSymbol(project: CodeProjectIR, symbolId?: string): string[] {
  return project.notes
    .filter((note) => note.symbolId === symbolId)
    .map((note) => note.text);
}

export function mapFolderToDiagramIr(
  project: CodeProjectIR,
  selectedFileIds: string[],
): DiagramIR {
  const ir = createCodeGraphIr("graph", "TB");
  const nodes: DiagramNode[] = [];
  const folderMap = new Map<string, string>();

  const files = project.files.filter((file) =>
    selectedFileIds.length === 0 || selectedFileIds.includes(file.id),
  );

  for (const file of files) {
    const parts = file.relativePath.split("/");
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;
      const nodeId = sanitizeDiagramId(currentPath);

      if (!folderMap.has(currentPath)) {
        folderMap.set(currentPath, nodeId);
        nodes.push({
          id: nodeId,
          label: part,
          kind: isFile ? "artifact" : "default",
          matchConfidence: 1,
          semantic: {
            path: currentPath,
            language: isFile ? file.language : undefined,
          },
        });
      }

      if (index > 0) {
        const parentPath = parts.slice(0, index).join("/");
        const parentId = folderMap.get(parentPath);
        if (parentId) {
          ir.edges.push({
            id: `${parentId}->${nodeId}`,
            source: parentId,
            target: nodeId,
            kind: "arrow",
            matchConfidence: 1,
          });
        }
      }
    });
  }

  ir.nodes = nodes;
  ir.groups = [];
  return ir;
}

export function mapClassToDiagramIr(
  project: CodeProjectIR,
  selectedFileIds: string[],
  selectedSymbolIds: string[],
): DiagramIR {
  const ir = createCodeGraphIr("class", "TB");
  const symbols = project.symbols.filter((symbol) => {
    if (symbol.kind !== "class" && symbol.kind !== "interface") {
      return false;
    }

    if (selectedSymbolIds.length > 0) {
      return selectedSymbolIds.includes(symbol.id);
    }

    return selectedFileIds.length === 0 || selectedFileIds.includes(symbol.fileId);
  });

  ir.nodes = symbols.map((symbol) => ({
    id: sanitizeDiagramId(symbol.name),
    label: symbol.name,
    kind: "class",
    matchConfidence: 1,
    semantic: {
      members: [...(symbol.members ?? [])],
      extends: [...(symbol.extends ?? [])],
      implements: [...(symbol.implements ?? [])],
      notes: notesForSymbol(project, symbol.id),
    },
  }));

  for (const symbol of symbols) {
    for (const base of symbol.extends ?? []) {
      ir.edges.push({
        id: `${symbol.name}-extends-${base}`,
        source: sanitizeDiagramId(symbol.name),
        target: sanitizeDiagramId(base),
        label: "extends",
        kind: "inherit",
        matchConfidence: 1,
      });
    }
  }

  return ir;
}

export function mapPackageToDiagramIr(
  project: CodeProjectIR,
  selectedFileIds: string[],
): DiagramIR {
  const ir = createCodeGraphIr("graph", "LR");
  const fileSet = new Set(
    selectedFileIds.length > 0
      ? selectedFileIds
      : project.files.map((file) => file.id),
  );

  ir.nodes = project.files
    .filter((file) => fileSet.has(file.id))
    .map((file) => ({
      id: sanitizeDiagramId(file.relativePath),
      label: file.relativePath,
      kind: "container" as const,
      matchConfidence: 1,
      semantic: { language: file.language },
    }));

  for (const edge of project.imports) {
    if (!fileSet.has(edge.sourceFileId)) {
      continue;
    }

    const sourceFile = project.files.find((file) => file.id === edge.sourceFileId);
    if (!sourceFile) {
      continue;
    }

    const targetFile = project.files.find((file) =>
      file.relativePath.includes(edge.target.replace(/\./g, "/")) ||
      file.relativePath.endsWith(`${edge.target}.py`) ||
      file.relativePath.endsWith(`${edge.target}.ts`) ||
      file.relativePath.endsWith(`${edge.target}.js`),
    );

    if (!targetFile || !fileSet.has(targetFile.id)) {
      ir.nodes.push({
        id: sanitizeDiagramId(edge.target),
        label: edge.target,
        kind: "artifact",
        matchConfidence: 0.6,
      });
    }

    ir.edges.push({
      id: edge.id,
      source: sanitizeDiagramId(sourceFile.relativePath),
      target: sanitizeDiagramId(targetFile?.relativePath ?? edge.target),
      label: "imports",
      kind: "arrow",
      matchConfidence: targetFile ? 1 : 0.5,
    });
  }

  return ir;
}

export function mapFlowToDiagramIr(
  project: CodeProjectIR,
  selectedSymbolIds: string[],
): DiagramIR {
  const ir = createCodeGraphIr("activity", "TB");
  const selected = new Set(selectedSymbolIds);
  const flows = project.flows.filter((flow) =>
    selected.size === 0 || selected.has(flow.symbolId),
  );

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const groups: DiagramGroup[] = [];

  flows.forEach((flow, flowIndex) => {
    const symbol = project.symbols.find((entry) => entry.id === flow.symbolId);
    const laneId = sanitizeDiagramId(symbol?.name ?? `flow-${flowIndex}`);
    groups.push({
      id: laneId,
      label: symbol?.name ?? "flow",
      parentId: undefined,
    });

    for (const node of flow.nodes) {
      nodes.push({
        id: `${laneId}_${node.id}`,
        label: node.label,
        kind:
          node.kind === "decision"
            ? "decision"
            : node.kind === "start" || node.kind === "end"
              ? node.kind
              : "default",
        groupId: laneId,
        matchConfidence: 1,
      });
    }

    for (const edge of flow.edges) {
      edges.push({
        id: `${laneId}_${edge.id}`,
        source: `${laneId}_${edge.sourceId}`,
        target: `${laneId}_${edge.targetId}`,
        label: edge.label,
        kind: "flow",
        matchConfidence: 1,
      });
    }
  });

  ir.nodes = nodes;
  ir.edges = edges;
  ir.groups = groups;
  return ir;
}

export function mapDependencyToDiagramIr(
  project: CodeProjectIR,
  selectedFileIds: string[],
  selectedSymbolIds: string[],
): DiagramIR {
  const ir = createCodeGraphIr("graph", "LR");
  const fileSet = new Set(
    selectedFileIds.length > 0
      ? selectedFileIds
      : project.files.map((file) => file.id),
  );
  const symbolSet = new Set(selectedSymbolIds);

  const symbols = project.symbols.filter((symbol) => {
    if (symbol.kind === "module") {
      return false;
    }

    if (symbolSet.size > 0) {
      return symbolSet.has(symbol.id);
    }

    return fileSet.has(symbol.fileId);
  });

  ir.nodes = symbols.map((symbol) => ({
    id: sanitizeDiagramId(`${symbol.fileId}_${symbol.name}`),
    label: symbol.name,
    kind: symbol.kind === "class" ? "class" : "default",
    matchConfidence: 1,
    semantic: {
      notes: notesForSymbol(project, symbol.id),
    },
  }));

  for (const call of project.calls) {
    const source = project.symbols.find((symbol) => symbol.id === call.sourceSymbolId);
    if (!source || (symbolSet.size > 0 && !symbolSet.has(source.id))) {
      continue;
    }

    const target = project.symbols.find((symbol) => symbol.name === call.targetName);
    const sourceId = sanitizeDiagramId(`${source.fileId}_${source.name}`);
    const targetId = sanitizeDiagramId(
      `${target?.fileId ?? "external"}_${call.targetName}`,
    );

    if (!ir.nodes.some((node) => node.id === targetId)) {
      ir.nodes.push({
        id: targetId,
        label: call.targetName,
        kind: "artifact",
        matchConfidence: target ? 1 : 0.5,
      });
    }

    ir.edges.push({
      id: call.id,
      source: sourceId,
      target: targetId,
      label: "calls",
      kind: "flow",
      matchConfidence: target ? 1 : 0.5,
    });
  }

  return ir;
}

export function mapCodeProjectToDiagramIr(
  project: CodeProjectIR,
  diagramType: CodeGraphDiagramType,
  selectedFileIds: string[],
  selectedSymbolIds: string[],
): DiagramIR {
  switch (diagramType) {
    case "folder":
      return mapFolderToDiagramIr(project, selectedFileIds);
    case "class":
      return mapClassToDiagramIr(project, selectedFileIds, selectedSymbolIds);
    case "package":
      return mapPackageToDiagramIr(project, selectedFileIds);
    case "flow":
      return mapFlowToDiagramIr(project, selectedSymbolIds);
    case "dependency":
      return mapDependencyToDiagramIr(project, selectedFileIds, selectedSymbolIds);
    default:
      return createCodeGraphIr("graph", "TB");
  }
}
