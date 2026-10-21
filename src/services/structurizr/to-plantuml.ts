import type {
  StructurizrDirection,
  StructurizrElement,
  StructurizrRelationship,
  StructurizrView,
  StructurizrWorkspace,
} from "@/services/structurizr/parse-dsl";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { C4_INCLUDE_PATHS } from "@/utils/plantuml-include";

const DATABASE_TAG = "database";
const GROUP_ALIAS_PREFIX = "group";

function plantUmlString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
  return `"${escaped}"`;
}

function sanitizeAlias(value: string, used: Set<string>): string {
  const cleaned = value.replace(/[^A-Za-z0-9_]/g, "_").replace(/^_+/, "");
  const base = /^[A-Za-z]/.test(cleaned) ? cleaned : `e_${cleaned || "element"}`;
  let alias = base;
  let suffix = 2;
  while (used.has(alias)) {
    alias = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(alias);
  return alias;
}

function isDatabase(
  element: StructurizrElement,
  cylinderTags: ReadonlySet<string>,
): boolean {
  return element.tags.some((tag) => {
    const normalized = tag.toLowerCase();
    return normalized === DATABASE_TAG || cylinderTags.has(normalized);
  });
}

function isWithin(
  element: StructurizrElement,
  ancestor: StructurizrElement,
): boolean {
  let current = element.parent;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function lift(
  element: StructurizrElement,
  accept: (candidate: StructurizrElement) => boolean,
  implied: boolean,
): StructurizrElement | null {
  if (accept(element)) {
    return element;
  }
  if (!implied) {
    return null;
  }

  let parent = element.parent;
  while (parent) {
    if (accept(parent)) {
      return parent;
    }
    parent = parent.parent;
  }
  return null;
}

function layoutCall(direction: StructurizrDirection): string {
  if (direction === "lr" || direction === "rl") {
    return "LAYOUT_LEFT_RIGHT()";
  }
  return "LAYOUT_TOP_DOWN()";
}

function elementMacro(
  element: StructurizrElement,
  external: boolean,
  cylinderTags: ReadonlySet<string>,
): string {
  const database = isDatabase(element, cylinderTags);
  switch (element.kind) {
    case "person":
      return external ? "Person_Ext" : "Person";
    case "softwareSystem":
      return external ? "System_Ext" : "System";
    case "container":
      if (database) {
        return external ? "ContainerDb_Ext" : "ContainerDb";
      }
      return external ? "Container_Ext" : "Container";
    case "component":
      if (database) {
        return external ? "ComponentDb_Ext" : "ComponentDb";
      }
      return external ? "Component_Ext" : "Component";
    default:
      return "Rectangle";
  }
}

function isExternal(element: StructurizrElement, view: StructurizrView): boolean {
  if (
    element.kind === "person" ||
    !view.scope ||
    view.type === "deployment" ||
    view.type === "systemLandscape"
  ) {
    return false;
  }
  if (view.type === "systemContext") {
    return element !== view.scope && element.kind === "softwareSystem";
  }
  return element.parent !== view.scope;
}

function emitElementCall(
  element: StructurizrElement,
  view: StructurizrView,
  alias: string,
  cylinderTags: ReadonlySet<string>,
): string {
  const macro = elementMacro(element, isExternal(element, view), cylinderTags);
  const name = plantUmlString(element.name);
  const description = plantUmlString(element.description);
  if (element.kind === "person" || element.kind === "softwareSystem") {
    return `${macro}(${alias}, ${name}, ${description})`;
  }
  return `${macro}(${alias}, ${name}, ${plantUmlString(element.technology)}, ${description})`;
}

function connectedElements(
  relationships: readonly StructurizrRelationship[],
  structural: (element: StructurizrElement) => boolean,
  optional: (element: StructurizrElement) => boolean,
  implied: boolean,
): StructurizrElement[] {
  const extras: StructurizrElement[] = [];
  const seen = new Set<StructurizrElement>();

  for (const relationship of relationships) {
    const pairs: Array<[StructurizrElement, StructurizrElement]> = [
      [relationship.source, relationship.destination],
      [relationship.destination, relationship.source],
    ];
    for (const [origin, other] of pairs) {
      const originHit = lift(origin, structural, implied);
      const otherHit = lift(other, optional, implied);
      if (originHit && otherHit && !seen.has(otherHit)) {
        seen.add(otherHit);
        extras.push(otherHit);
      }
    }
  }

  return extras;
}

function architectureElements(
  workspace: StructurizrWorkspace,
  view: StructurizrView,
): Set<StructurizrElement> {
  const visible = new Set<StructurizrElement>();
  const scope = view.scope;

  if (view.type === "systemLandscape" && view.includeAll) {
    for (const element of workspace.elements) {
      if (
        (element.kind === "person" || element.kind === "softwareSystem") &&
        !element.parent &&
        !element.instanceOf
      ) {
        visible.add(element);
      }
    }
  }

  if (view.type === "systemContext" && scope && view.includeAll) {
    visible.add(scope);
    for (const element of connectedElements(
      workspace.relationships,
      (element) => element === scope,
      (element) =>
        (element.kind === "person" || element.kind === "softwareSystem") &&
        !element.parent &&
        !element.instanceOf &&
        element !== scope,
      workspace.impliedRelationships,
    )) {
      visible.add(element);
    }
  }

  if (view.type === "container" && scope && view.includeAll) {
    for (const element of workspace.elements) {
      if (
        element.kind === "container" &&
        element.parent === scope &&
        !element.instanceOf
      ) {
        visible.add(element);
      }
    }
    for (const element of connectedElements(
      workspace.relationships,
      (element) =>
        element === scope ||
        (element.kind === "container" &&
          element.parent === scope &&
          !element.instanceOf),
      (element) =>
        (element.kind === "person" || element.kind === "softwareSystem") &&
        !element.parent &&
        !element.instanceOf &&
        element !== scope,
      workspace.impliedRelationships,
    )) {
      visible.add(element);
    }
  }

  if (view.type === "component" && scope && view.includeAll) {
    const system = scope.parent;
    for (const element of scope.children) {
      if (element.kind === "component" && !element.instanceOf) {
        visible.add(element);
      }
    }
    for (const element of connectedElements(
      workspace.relationships,
      (element) =>
        element === scope ||
        (element.kind === "component" &&
          element.parent === scope &&
          !element.instanceOf),
      (element) => {
        if (element.instanceOf) {
          return false;
        }
        if (
          (element.kind === "person" || element.kind === "softwareSystem") &&
          !element.parent &&
          element !== system
        ) {
          return true;
        }
        return (
          element.kind === "container" &&
          system !== null &&
          element.parent === system &&
          element !== scope
        );
      },
      workspace.impliedRelationships,
    )) {
      visible.add(element);
    }
  }

  for (const element of view.includes) {
    visible.add(element);
  }
  for (const element of view.excludes) {
    visible.delete(element);
  }
  if (scope && (view.type === "container" || view.type === "component")) {
    visible.delete(scope);
  }
  return visible;
}

function assignAliases(
  elements: readonly StructurizrElement[],
  reserved: Set<string>,
): Map<StructurizrElement, string> {
  const aliases = new Map<StructurizrElement, string>();
  for (const element of elements) {
    aliases.set(element, sanitizeAlias(element.localId, reserved));
  }
  return aliases;
}

function groupedLines(
  elements: readonly StructurizrElement[],
  view: StructurizrView,
  aliases: Map<StructurizrElement, string>,
  used: Set<string>,
  indent: string,
  cylinderTags: ReadonlySet<string>,
): string[] {
  const plain: StructurizrElement[] = [];
  const groups = new Map<string, StructurizrElement[]>();
  for (const element of elements) {
    if (!element.group) {
      plain.push(element);
      continue;
    }
    const bucket = groups.get(element.group) ?? [];
    bucket.push(element);
    groups.set(element.group, bucket);
  }

  const lines: string[] = [];
  for (const element of plain) {
    const alias = aliases.get(element);
    if (alias) {
      lines.push(`${indent}${emitElementCall(element, view, alias, cylinderTags)}`);
    }
  }
  for (const [name, members] of groups) {
    const alias = sanitizeAlias(GROUP_ALIAS_PREFIX, used);
    lines.push(`${indent}Boundary(${alias}, ${plantUmlString(name)}, "group") {`);
    for (const element of members) {
      const memberAlias = aliases.get(element);
      if (memberAlias) {
        lines.push(
          `${indent}  ${emitElementCall(element, view, memberAlias, cylinderTags)}`,
        );
      }
    }
    lines.push(`${indent}}`);
  }
  return lines;
}

function relationshipLines(
  workspace: StructurizrWorkspace,
  view: StructurizrView,
  visible: Set<StructurizrElement>,
  aliases: Map<StructurizrElement, string>,
  boundaryAlias: string,
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const scope = view.scope;

  for (const relationship of workspace.relationships) {
    const accept = (element: StructurizrElement) =>
      visible.has(element) ||
      (scope !== null &&
        element === scope &&
        (view.type === "container" || view.type === "component"));
    const left = lift(relationship.source, accept, workspace.impliedRelationships);
    const right = lift(
      relationship.destination,
      accept,
      workspace.impliedRelationships,
    );
    if (!left || !right || left === right) {
      continue;
    }
    const leftAlias =
      aliases.get(left) ?? (left === scope ? boundaryAlias : "");
    const rightAlias =
      aliases.get(right) ?? (right === scope ? boundaryAlias : "");
    if (!leftAlias || !rightAlias) {
      continue;
    }
    const key = `${leftAlias}->${rightAlias}:${relationship.description}:${relationship.technology}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    lines.push(
      `Rel(${leftAlias}, ${rightAlias}, ${plantUmlString(relationship.description || " ")}, ${plantUmlString(relationship.technology)})`,
    );
  }

  return lines;
}

function diagramShell(
  includePath: string,
  view: StructurizrView,
  workspace: StructurizrWorkspace,
  body: string[],
): string {
  const title = view.description || view.key || workspace.name;
  const lines = [
    "@startuml",
    `!include ${includePath}`,
    layoutCall(view.direction),
  ];
  if (title) {
    lines.push(`title ${plantUmlString(title)}`);
  }
  lines.push(...body, "@enduml");
  return lines.join("\n");
}

function emitArchitectureView(
  workspace: StructurizrWorkspace,
  view: StructurizrView,
): string | null {
  const visible = architectureElements(workspace, view);
  if (visible.size === 0 && view.type !== "container" && view.type !== "component") {
    return null;
  }

  const used = new Set<string>();
  const usesBoundary = view.type === "container" || view.type === "component";
  const boundaryAlias =
    usesBoundary && view.scope ? sanitizeAlias(view.scope.localId, used) : "";
  const aliases = assignAliases([...visible], used);
  const scope = view.scope;
  const inside =
    scope && (view.type === "container" || view.type === "component")
      ? scope.children.filter((element) => visible.has(element))
      : [];
  const outside = workspace.elements.filter(
    (element) => visible.has(element) && !inside.includes(element),
  );

  if (outside.length === 0 && inside.length === 0) {
    return null;
  }

  const body: string[] = [];
  if (view.type === "systemContext" && scope && visible.has(scope)) {
    const people = outside.filter((element) => element.kind === "person");
    const others = outside.filter((element) => element !== scope && element.kind !== "person");
    body.push(
      ...groupedLines(people, view, aliases, used, "", workspace.cylinderTags),
    );
    const scopeAlias = aliases.get(scope);
    if (scopeAlias) {
      body.push(emitElementCall(scope, view, scopeAlias, workspace.cylinderTags));
    }
    body.push(
      ...groupedLines(others, view, aliases, used, "", workspace.cylinderTags),
    );
  } else if (scope && (view.type === "container" || view.type === "component")) {
    body.push(
      ...groupedLines(outside, view, aliases, used, "", workspace.cylinderTags),
    );
    const boundary =
      view.type === "component" ? "Container_Boundary" : "System_Boundary";
    body.push(`${boundary}(${boundaryAlias}, ${plantUmlString(scope.name)}) {`);
    body.push(
      ...groupedLines(inside, view, aliases, used, "  ", workspace.cylinderTags),
    );
    body.push("}");
  } else {
    body.push(
      ...groupedLines(outside, view, aliases, used, "", workspace.cylinderTags),
    );
  }

  body.push(...relationshipLines(workspace, view, visible, aliases, boundaryAlias));
  const includePath =
    view.type === "component"
      ? C4_INCLUDE_PATHS.component
      : view.type === "container"
        ? C4_INCLUDE_PATHS.container
        : C4_INCLUDE_PATHS.context;
  return diagramShell(includePath, view, workspace, body);
}

function instanceInScope(
  element: StructurizrElement,
  scope: StructurizrElement | null,
): boolean {
  if (!element.instanceOf) {
    return false;
  }
  if (!scope) {
    return true;
  }
  return element.instanceOf === scope || isWithin(element.instanceOf, scope);
}

function deploymentNodeVisible(
  node: StructurizrElement,
  scope: StructurizrElement | null,
  excluded: Set<StructurizrElement>,
): boolean {
  if (excluded.has(node)) {
    return false;
  }
  return node.children.some((child) => {
    if (excluded.has(child)) {
      return false;
    }
    if (child.kind === "deploymentNode") {
      return deploymentNodeVisible(child, scope, excluded);
    }
    return instanceInScope(child, scope);
  });
}

function emitDeploymentNode(
  node: StructurizrElement,
  view: StructurizrView,
  aliases: Map<StructurizrElement, string>,
  scope: StructurizrElement | null,
  excluded: Set<StructurizrElement>,
  indent: string,
  cylinderTags: ReadonlySet<string>,
): string[] {
  if (!deploymentNodeVisible(node, scope, excluded)) {
    return [];
  }

  const alias = aliases.get(node);
  if (!alias) {
    return [];
  }

  const lines = [
    `${indent}Deployment_Node(${alias}, ${plantUmlString(node.name)}, ${plantUmlString(node.technology)}, ${plantUmlString(node.description)}) {`,
  ];
  for (const child of node.children) {
    if (excluded.has(child)) {
      continue;
    }
    if (child.kind === "deploymentNode") {
      lines.push(
        ...emitDeploymentNode(
          child,
          view,
          aliases,
          scope,
          excluded,
          `${indent}  `,
          cylinderTags,
        ),
      );
      continue;
    }
    if (!instanceInScope(child, scope)) {
      continue;
    }
    const childAlias = aliases.get(child);
    if (childAlias) {
      lines.push(
        `${indent}  ${emitElementCall(child, view, childAlias, cylinderTags)}`,
      );
    }
  }
  lines.push(`${indent}}`);
  return lines;
}

function collectDeploymentElements(
  roots: readonly StructurizrElement[],
  scope: StructurizrElement | null,
  excluded: Set<StructurizrElement>,
): StructurizrElement[] {
  const collected: StructurizrElement[] = [];
  const visit = (element: StructurizrElement) => {
    if (excluded.has(element)) {
      return;
    }
    if (element.kind === "deploymentNode") {
      if (!deploymentNodeVisible(element, scope, excluded)) {
        return;
      }
      collected.push(element);
      element.children.forEach(visit);
      return;
    }
    if (instanceInScope(element, scope)) {
      collected.push(element);
    }
  };
  roots.forEach(visit);
  return collected;
}

function emitDeploymentView(
  workspace: StructurizrWorkspace,
  view: StructurizrView,
): string | null {
  if (!view.includeAll && view.includes.length === 0) {
    return null;
  }

  const excluded = new Set(view.excludes);
  const roots = view.environment
    ? view.environment.children
    : workspace.elements
        .filter((element) => element.kind === "deploymentEnvironment")
        .flatMap((element) => element.children);
  const drawn = collectDeploymentElements(roots, view.scope, excluded);
  if (drawn.length === 0) {
    return null;
  }

  const used = new Set<string>();
  const aliases = assignAliases(drawn, used);
  const body = roots.flatMap((root) =>
    root.kind === "deploymentNode"
      ? emitDeploymentNode(
          root,
          view,
          aliases,
          view.scope,
          excluded,
          "",
          workspace.cylinderTags,
        )
      : [],
  );
  if (body.length === 0) {
    return null;
  }
  return diagramShell(C4_INCLUDE_PATHS.deployment, view, workspace, body);
}

function emitView(
  workspace: StructurizrWorkspace,
  view: StructurizrView,
): string | null {
  if (view.type === "deployment") {
    return emitDeploymentView(workspace, view);
  }
  return emitArchitectureView(workspace, view);
}

export function structurizrToPlantUml(workspace: StructurizrWorkspace): string[] {
  const diagrams = workspace.views.flatMap((view) => {
    const diagram = emitView(workspace, view);
    return diagram ? [diagram] : [];
  });

  if (diagrams.length === 0) {
    const name = workspace.views[0]?.key || workspace.name || "workspace";
    throw new LocalizedAppError("structurizr.emptyView", { name });
  }

  return diagrams;
}
