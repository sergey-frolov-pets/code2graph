import { unwrapStructurizrSource } from "@shared/structurizr-source";
import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  classifyDiagramKind,
  detectDiagramDirection,
} from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNodeSemanticKind,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import {
  parseStructurizr,
  type StructurizrElement,
} from "@/services/structurizr/parse-dsl";

function elementToSemanticKind(element: StructurizrElement): DiagramNodeSemanticKind {
  switch (element.kind) {
    case "person":
      return "actor";
    case "softwareSystem":
      return "system";
    case "container":
    case "component":
    case "deploymentNode":
      return "container";
    default:
      return "default";
  }
}

function elementToC4Type(
  element: StructurizrElement,
  cylinderTags: ReadonlySet<string>,
): string {
  const isDb = element.tags.some((tag) => {
    const lower = tag.toLowerCase();
    return lower === "database" || cylinderTags.has(lower);
  });

  switch (element.kind) {
    case "person":
      return "Person";
    case "softwareSystem":
      return "System";
    case "container":
      return isDb ? "ContainerDb" : "Container";
    case "component":
      return isDb ? "ContainerDb" : "Container";
    case "deploymentNode":
      return "Deployment_Node";
    default:
      return "System";
  }
}

export function parseStructurizrToIr(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const unwrapped = unwrapStructurizrSource(source);
  const kind = classifyDiagramKind(unwrapped, format);
  const direction = detectDiagramDirection(unwrapped, format);

  try {
    const workspace = parseStructurizr(unwrapped);
    const viewType = workspace.views[0]?.type;
    const resolvedKind =
      viewType === "deployment"
        ? "deployment"
        : viewType === "container" || viewType === "component"
          ? "c4_container"
          : viewType === "systemContext" || viewType === "systemLandscape"
            ? "c4_context"
            : kind;

    const ir = createEmptyDiagramIR(resolvedKind);
    const viewDir = workspace.views[0]?.direction;
    ir.direction =
      viewDir === "lr" || viewDir === "rl" ? "LR" : direction ?? "TB";
    ir.metadata = { sourceFormat: format };

    if (workspace.name) {
      ir.extras = { ...ir.extras, title: workspace.name };
    }

    const usedIds = new Set<string>();
    const elementToNodeId = new Map<StructurizrElement, string>();
    const groups: DiagramGroup[] = [];
    const elementToGroupId = new Map<StructurizrElement, string>();

    for (const element of workspace.elements) {
      if (element.kind === "deploymentEnvironment") {
        continue;
      }

      const hasStructuralChildren = element.children.some(
        (child) =>
          child.kind === "container" ||
          child.kind === "component" ||
          child.kind === "deploymentNode" ||
          child.instanceOf !== null,
      );

      if (hasStructuralChildren && resolvedKind !== "c4_context") {
        const groupId = uniqueDiagramId(element.localId || element.name, usedIds);
        const parentGroupId = element.parent
          ? elementToGroupId.get(element.parent)
          : undefined;
        groups.push({
          id: groupId,
          label: element.name,
          parentId: parentGroupId,
        });
        elementToGroupId.set(element, groupId);
        if (!ir.extras?.systemBoundary && element.kind === "softwareSystem") {
          ir.extras = { ...ir.extras, systemBoundary: element.name };
        }
      }
    }

    for (const element of workspace.elements) {
      if (element.kind === "deploymentEnvironment") {
        continue;
      }

      if (elementToGroupId.has(element) && resolvedKind === "c4_container") {
        continue;
      }

      if (
        resolvedKind === "deployment" &&
        !element.instanceOf &&
        element.kind !== "deploymentNode"
      ) {
        continue;
      }

      const id = uniqueDiagramId(element.localId || element.name, usedIds);
      elementToNodeId.set(element, id);
      if (element.instanceOf && !elementToNodeId.has(element.instanceOf)) {
        elementToNodeId.set(element.instanceOf, id);
      }

      const groupId = element.parent
        ? elementToGroupId.get(element.parent) ?? elementToNodeId.get(element.parent)
        : undefined;

      ir.nodes.push({
        id,
        label: element.name,
        kind: elementToSemanticKind(element),
        groupId,
        semantic: {
          c4Type: elementToC4Type(element, workspace.cylinderTags),
          description: element.description || undefined,
          technology: element.technology || undefined,
          structurizrKind: element.kind,
        },
        matchConfidence: 1,
      });
    }

    const resolveEndpoint = (element: StructurizrElement): string | undefined => {
      const direct = elementToNodeId.get(element);
      if (direct) {
        return direct;
      }
      for (const child of element.children) {
        const childId = elementToNodeId.get(child);
        if (childId) {
          return childId;
        }
      }
      if (element.parent) {
        return elementToNodeId.get(element.parent);
      }
      return undefined;
    };

    for (const rel of workspace.relationships) {
      const sourceId = resolveEndpoint(rel.source);
      const targetId = resolveEndpoint(rel.destination);
      if (!sourceId || !targetId || sourceId === targetId) {
        continue;
      }
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: rel.description || undefined,
        semantic: rel.technology ? { technology: rel.technology } : undefined,
        matchConfidence: 1,
      });
    }

    if (groups.length > 0) {
      ir.groups = groups;
    }

    return ir;
  } catch {
    return parseStructurizrFallback(unwrapped, format, kind, direction);
  }
}

function parseStructurizrFallback(
  source: string,
  format: DiagramFormat,
  kind: ReturnType<typeof classifyDiagramKind>,
  direction: "TB" | "LR" | undefined,
): DiagramIR {
  const ir = createEmptyDiagramIR(kind);
  ir.direction = direction;
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();

  const elementPattern =
    /(?:([\p{L}\p{N}_]+)\s*=\s*)?\b(person|softwareSystem|container|component|deploymentNode|infrastructureNode)\s+"([^"]+)"(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/giu;

  for (const match of source.matchAll(elementPattern)) {
    const alias = match[1] || match[3];
    const elType = match[2].toLowerCase();
    const name = match[3].trim();
    const description = match[4]?.trim();
    const technology = match[5]?.trim();
    const id = uniqueDiagramId(alias, usedIds);
    aliasToId.set(alias, id);
    aliasToId.set(name, id);
    ir.nodes.push({
      id,
      label: name,
      kind:
        elType === "person"
          ? "actor"
          : elType === "softwaresystem"
            ? "system"
            : "container",
      semantic: {
        c4Type:
          elType === "person"
            ? "Person"
            : elType === "softwaresystem"
              ? "System"
              : "Container",
        description,
        technology,
      },
      matchConfidence: 0.9,
    });
  }

  const relPattern =
    /([\p{L}\p{N}_.]+)\s*->\s*([\p{L}\p{N}_.]+)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/gu;
  for (const match of source.matchAll(relPattern)) {
    const fromKey = match[1].split(".").pop() ?? match[1];
    const toKey = match[2].split(".").pop() ?? match[2];
    const sourceId = aliasToId.get(match[1]) ?? aliasToId.get(fromKey);
    const targetId = aliasToId.get(match[2]) ?? aliasToId.get(toKey);
    if (!sourceId || !targetId) {
      continue;
    }
    ir.edges.push({
      id: `e${ir.edges.length + 1}`,
      source: sourceId,
      target: targetId,
      label: match[3]?.trim() || undefined,
      semantic: match[4]?.trim() ? { technology: match[4].trim() } : undefined,
      matchConfidence: 0.9,
    });
  }

  return ir;
}
