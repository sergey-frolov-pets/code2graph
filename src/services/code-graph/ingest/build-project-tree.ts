import type {
  CodeProjectIR,
  CodeSymbol,
  ProjectTreeNode,
} from "@/services/code-graph/ir/code-project-ir";

let treeNodeCounter = 0;

function createTreeNodeId(prefix: string): string {
  treeNodeCounter += 1;
  return `${prefix}-${treeNodeCounter}`;
}

export function resetProjectTreeIdCounter(): void {
  treeNodeCounter = 0;
}

function buildFolderTree(
  project: CodeProjectIR,
  parent: ProjectTreeNode,
  folderPath: string,
): void {
  const prefix = folderPath ? `${folderPath}/` : "";
  const directFolders = new Set<string>();
  const directFiles = project.files.filter((file) => {
    if (folderPath && !file.relativePath.startsWith(prefix)) {
      return false;
    }

    const remainder = folderPath
      ? file.relativePath.slice(prefix.length)
      : file.relativePath;
    if (!remainder || remainder.includes("/")) {
      const firstSegment = remainder.split("/")[0];
      if (firstSegment) {
        directFolders.add(firstSegment);
      }
      return false;
    }

    return true;
  });

  for (const folderName of [...directFolders].sort()) {
    const childPath = prefix ? `${prefix}${folderName}` : folderName;
    const folderNode: ProjectTreeNode = {
      id: createTreeNodeId("folder"),
      label: folderName,
      kind: "folder",
      path: childPath,
      children: [],
      checked: false,
      indeterminate: false,
      depth: parent.depth + 1,
    };
    parent.children.push(folderNode);
    buildFolderTree(project, folderNode, childPath);
  }

  for (const file of directFiles.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  )) {
    const fileNode: ProjectTreeNode = {
      id: createTreeNodeId("file"),
      label: file.relativePath.split("/").pop() ?? file.relativePath,
      kind: "file",
      path: file.relativePath,
      fileId: file.id,
      children: [],
      checked: false,
      indeterminate: false,
      depth: parent.depth + 1,
    };

    const fileSymbols = project.symbols.filter(
      (symbol) =>
        symbol.fileId === file.id &&
        (symbol.kind === "class" ||
          symbol.kind === "interface" ||
          symbol.kind === "function"),
    );
    for (const symbol of fileSymbols) {
      fileNode.children.push(createSymbolNode(symbol, project, fileNode.depth + 1));
    }

    parent.children.push(fileNode);
  }
}

function createSymbolNode(
  symbol: CodeSymbol,
  project: CodeProjectIR,
  depth: number,
): ProjectTreeNode {
  const node: ProjectTreeNode = {
    id: createTreeNodeId("symbol"),
    label: symbol.name,
    kind: "symbol",
    symbolId: symbol.id,
    fileId: symbol.fileId,
    children: [],
    checked: false,
    indeterminate: false,
    depth,
  };

  const childSymbols = project.symbols.filter(
    (entry) => entry.parentId === symbol.id && entry.kind === "method",
  );
  for (const child of childSymbols) {
    node.children.push(createSymbolNode(child, project, depth + 1));
  }

  return node;
}

export function buildProjectTree(project: CodeProjectIR): ProjectTreeNode {
  resetProjectTreeIdCounter();

  const root: ProjectTreeNode = {
    id: createTreeNodeId("project"),
    label: project.rootName,
    kind: "project",
    children: [],
    checked: true,
    indeterminate: false,
    depth: 0,
  };

  buildFolderTree(project, root, "");
  return root;
}

export function flattenProjectTree(
  root: ProjectTreeNode,
): ProjectTreeNode[] {
  const result: ProjectTreeNode[] = [];

  function walk(node: ProjectTreeNode): void {
    result.push(node);
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(root);
  return result;
}

export function collectCheckedTreeNodes(root: ProjectTreeNode): ProjectTreeNode[] {
  return flattenProjectTree(root).filter((node) => node.checked);
}

export function setTreeNodeChecked(
  root: ProjectTreeNode,
  nodeId: string,
  checked: boolean,
): void {
  const node = flattenProjectTree(root).find((entry) => entry.id === nodeId);
  if (!node) {
    return;
  }

  node.checked = checked;
  node.indeterminate = false;

  function applyToChildren(entry: ProjectTreeNode): void {
    for (const child of entry.children) {
      child.checked = checked;
      child.indeterminate = false;
      applyToChildren(child);
    }
  }

  applyToChildren(node);
  updateParentCheckState(root);
}

function updateParentCheckState(node: ProjectTreeNode): void {
  for (const child of node.children) {
    updateParentCheckState(child);
  }

  if (node.children.length === 0) {
    return;
  }

  const checkedCount = node.children.filter((child) => child.checked).length;
  const indeterminateCount = node.children.filter(
    (child) => child.indeterminate,
  ).length;

  node.checked = checkedCount === node.children.length;
  node.indeterminate =
    (checkedCount > 0 && checkedCount < node.children.length) ||
    indeterminateCount > 0;
}

export function resolveSelectedFileIds(root: ProjectTreeNode): string[] {
  const checked = collectCheckedTreeNodes(root);
  const fileIds = new Set<string>();

  for (const node of checked) {
    if (node.fileId) {
      fileIds.add(node.fileId);
    }
  }

  return [...fileIds];
}

export function resolveSelectedSymbolIds(root: ProjectTreeNode): string[] {
  const checked = collectCheckedTreeNodes(root);
  return checked
    .filter((node) => node.kind === "symbol" && node.symbolId)
    .map((node) => node.symbolId as string);
}
