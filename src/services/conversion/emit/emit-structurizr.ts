import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { flattenPlantUmlLabel } from "@/services/conversion/emit/plantuml-emit-utils";

function dslString(value: string): string {
  const cleaned = flattenPlantUmlLabel(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .trim();
  return `"${cleaned || "Element"}"`;
}

function safeDslIdentifier(value: string, used: Set<string>, prefix = "el"): string {
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{N}_]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  const base =
    cleaned && /^[\p{L}_]/u.test(cleaned)
      ? cleaned
      : `${prefix}_${cleaned || "1"}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function resolveAutoLayout(ir: DiagramIR): "lr" | "tb" {
  return ir.direction === "LR" ? "lr" : "tb";
}

function isNodePerson(node: DiagramIR["nodes"][number]): boolean {
  const c4Type = String(node.semantic?.c4Type ?? "").toLowerCase();
  const stKind = String(node.semantic?.structurizrKind ?? "").toLowerCase();
  return node.kind === "actor" || c4Type.startsWith("person") || stKind === "person";
}

function isNodeDatabase(node: DiagramIR["nodes"][number]): boolean {
  const c4Type = String(node.semantic?.c4Type ?? "").toLowerCase();
  const d2Shape = String(node.semantic?.d2Shape ?? "").toLowerCase();
  return (
    c4Type.includes("db") ||
    c4Type.includes("database") ||
    d2Shape === "cylinder" ||
    /db|database|sql|база|бд|хранилище/i.test(node.label)
  );
}

function emitDeploymentDsl(
  ir: DiagramIR,
  workspaceTitle: string,
  layout: "lr" | "tb",
): string {
  const usedIds = new Set<string>(["shop", "live", "cluster"]);
  const containerAliases = new Map<string, string>();
  const lines = [
    `workspace ${dslString(workspaceTitle)} "Deployment" {`,
    "    model {",
    `        shop = softwareSystem ${dslString(workspaceTitle)} "System" {`,
  ];

  const nodes = ir.nodes.length > 0
    ? ir.nodes
    : [{ id: "app", label: "Application", matchConfidence: 1 }];

  for (const node of nodes) {
    const alias = safeDslIdentifier(node.id, usedIds, "c");
    containerAliases.set(node.id, alias);
    const tech = String(node.semantic?.technology ?? "Service");
    const desc = String(node.semantic?.description ?? node.label);
    if (isNodeDatabase(node)) {
      lines.push(
        `            ${alias} = container ${dslString(node.label)} ${dslString(desc)} ${dslString(tech)} {`,
        '                tags "Database"',
        "            }",
      );
    } else {
      lines.push(
        `            ${alias} = container ${dslString(node.label)} ${dslString(desc)} ${dslString(tech)}`,
      );
    }
  }

  lines.push("        }", "");

  for (const edge of ir.edges) {
    const from = containerAliases.get(edge.source);
    const to = containerAliases.get(edge.target);
    if (from && to && from !== to) {
      const label = edge.label || "Uses";
      lines.push(`        ${from} -> ${to} ${dslString(label)}`);
    }
  }

  lines.push(
    "",
    '        live = deploymentEnvironment "Production" {',
    '            cluster = deploymentNode "Cluster" "Deployment cluster" "Infrastructure" {',
  );

  for (const node of nodes) {
    const alias = containerAliases.get(node.id)!;
    lines.push(`                containerInstance ${alias}`);
  }

  lines.push(
    "            }",
    "        }",
    "    }",
    "    views {",
    '        deployment shop live "Deployment" {',
    "            include *",
    `            autolayout ${layout}`,
    "        }",
    "    }",
    "}",
  );

  return lines.join("\n");
}

function emitContextDsl(
  ir: DiagramIR,
  workspaceTitle: string,
  layout: "lr" | "tb",
): string {
  const usedIds = new Set<string>();
  const aliasById = new Map<string, string>();
  const lines = [
    `workspace ${dslString(workspaceTitle)} "System Context" {`,
    "    model {",
  ];

  const nodes = ir.nodes.length > 0
    ? ir.nodes
    : [
        { id: "user", label: "User", kind: "actor" as const, matchConfidence: 1 },
        { id: "system", label: "System", kind: "system" as const, matchConfidence: 1 },
      ];

  let primarySystemAlias: string | null = null;

  for (const node of nodes) {
    const alias = safeDslIdentifier(node.id, usedIds, "sys");
    aliasById.set(node.id, alias);
    const desc = String(node.semantic?.description ?? node.label);

    if (isNodePerson(node)) {
      lines.push(`        ${alias} = person ${dslString(node.label)} ${dslString(desc)}`);
    } else {
      if (!primarySystemAlias) {
        primarySystemAlias = alias;
      }
      lines.push(
        `        ${alias} = softwareSystem ${dslString(node.label)} ${dslString(desc)}`,
      );
    }
  }

  if (!primarySystemAlias) {
    primarySystemAlias = safeDslIdentifier("coreSystem", usedIds, "sys");
    lines.push(
      `        ${primarySystemAlias} = softwareSystem ${dslString(workspaceTitle)} "Core system"`,
    );
    const firstActorAlias = aliasById.get(nodes[0].id);
    if (firstActorAlias) {
      lines.push(`        ${firstActorAlias} -> ${primarySystemAlias} "Uses"`);
    }
  }

  for (const edge of ir.edges) {
    const from = aliasById.get(edge.source);
    const to = aliasById.get(edge.target);
    if (from && to && from !== to) {
      const label = edge.label || "Uses";
      const tech = edge.semantic?.technology
        ? ` ${dslString(String(edge.semantic.technology))}`
        : "";
      lines.push(`        ${from} -> ${to} ${dslString(label)}${tech}`);
    }
  }

  lines.push(
    "    }",
    "    views {",
    `        systemContext ${primarySystemAlias} "Context" {`,
    "            include *",
    `            autolayout ${layout}`,
    "        }",
    "    }",
    "}",
  );

  return lines.join("\n");
}

function emitContainerDsl(
  ir: DiagramIR,
  workspaceTitle: string,
  layout: "lr" | "tb",
): string {
  const usedIds = new Set<string>(["coreSystem"]);
  const aliasById = new Map<string, string>();
  const systemBoundaryName =
    ir.extras?.systemBoundary ?? ir.groups?.[0]?.label ?? workspaceTitle;

  const people = ir.nodes.filter((node) => isNodePerson(node));
  const externalSystems = ir.nodes.filter(
    (node) =>
      !isNodePerson(node) &&
      String(node.semantic?.c4Type ?? "").toLowerCase().includes("system_ext"),
  );
  const externalIds = new Set([
    ...people.map((n) => n.id),
    ...externalSystems.map((n) => n.id),
  ]);
  const containers = ir.nodes.filter((node) => !externalIds.has(node.id));

  const lines = [
    `workspace ${dslString(workspaceTitle)} "Containers" {`,
    "    model {",
  ];

  for (const person of people) {
    const alias = safeDslIdentifier(person.id, usedIds, "actor");
    aliasById.set(person.id, alias);
    const desc = String(person.semantic?.description ?? person.label);
    lines.push(`        ${alias} = person ${dslString(person.label)} ${dslString(desc)}`);
  }

  for (const ext of externalSystems) {
    const alias = safeDslIdentifier(ext.id, usedIds, "ext");
    aliasById.set(ext.id, alias);
    const desc = String(ext.semantic?.description ?? ext.label);
    lines.push(
      `        ${alias} = softwareSystem ${dslString(ext.label)} ${dslString(desc)}`,
    );
  }

  lines.push(
    `        coreSystem = softwareSystem ${dslString(systemBoundaryName)} "Main software system" {`,
  );

  const effectiveContainers =
    containers.length > 0
      ? containers
      : [{ id: "app", label: workspaceTitle, matchConfidence: 1 }];

  for (const container of effectiveContainers) {
    const alias = safeDslIdentifier(container.id, usedIds, "cnt");
    aliasById.set(container.id, alias);
    const desc = String(container.semantic?.description ?? container.label);
    const tech = String(container.semantic?.technology ?? "Service");
    if (isNodeDatabase(container)) {
      lines.push(
        `            ${alias} = container ${dslString(container.label)} ${dslString(desc)} ${dslString(tech)} {`,
        '                tags "Database"',
        "            }",
      );
    } else {
      lines.push(
        `            ${alias} = container ${dslString(container.label)} ${dslString(desc)} ${dslString(tech)}`,
      );
    }
  }

  lines.push("        }");

  for (const edge of ir.edges) {
    const from = aliasById.get(edge.source);
    const to = aliasById.get(edge.target);
    if (from && to && from !== to) {
      const label = edge.label || "Uses";
      const tech = edge.semantic?.technology
        ? ` ${dslString(String(edge.semantic.technology))}`
        : "";
      lines.push(`        ${from} -> ${to} ${dslString(label)}${tech}`);
    }
  }

  lines.push(
    "    }",
    "    views {",
    '        container coreSystem "Containers" {',
    "            include *",
    `            autolayout ${layout}`,
    "        }",
    "    }",
    "}",
  );

  return lines.join("\n");
}

export function emitStructurizrFromIr(ir: DiagramIR): string {
  const workspaceTitle = ir.extras?.title || ir.extras?.systemBoundary || "Architecture";
  const layout = resolveAutoLayout(ir);

  if (ir.kind === "deployment") {
    return emitDeploymentDsl(ir, workspaceTitle, layout);
  }

  if (ir.kind === "c4_context") {
    return emitContextDsl(ir, workspaceTitle, layout);
  }

  return emitContainerDsl(ir, workspaceTitle, layout);
}
