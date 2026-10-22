import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { flattenPlantUmlLabel } from "@/services/conversion/emit/plantuml-emit-utils";

function cleanWiremarkText(value: string): string {
  return flattenPlantUmlLabel(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .trim();
}

function safeScreenId(value: string, fallbackIndex = 1): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `screen-${fallbackIndex}`;
}

export function emitWiremarkFromIr(ir: DiagramIR): string {
  const screens = ir.extras?.wireframeScreens;
  if (screens && screens.length > 0) {
    const lines: string[] = [];
    if (screens.length > 1) {
      lines.push(`Flow ${ir.direction === "LR" ? "LR" : "TB"}`, "");
    }

    screens.forEach((screen, idx) => {
      const screenId = safeScreenId(screen.id, idx + 1);
      const layoutSuffix =
        screen.layout && screen.layout !== "default" ? ` ${screen.layout}` : " mobile";
      lines.push(`Wireframe #${screenId}${layoutSuffix}`);
      lines.push("  Stack column gap=2");

      if (screen.controls.length === 0) {
        lines.push(`    Typography h4 "${cleanWiremarkText(screen.title || screen.id)}"`);
      }

      for (const control of screen.controls) {
        const text = cleanWiremarkText(control.label);
        const toAttr = control.targetScreenId
          ? ` to=#${safeScreenId(control.targetScreenId)}`
          : "";
        switch (control.kind) {
          case "heading":
            lines.push(`    Typography h4 "${text}"`);
            break;
          case "input":
            lines.push(`    TextField "${text}"`);
            break;
          case "button":
            lines.push(`    Button "${text}" contained${toAttr}`);
            break;
          case "link":
            lines.push(`    Link "${text}"${toAttr}`);
            break;
          case "item":
            lines.push(`    ListItem "${text}"${toAttr}`);
            break;
          case "checkbox":
            lines.push("    Stack row");
            lines.push("      Control checkbox");
            lines.push(`      Typography body1 "${text}"`);
            break;
          default:
            lines.push(`    Typography body1 "${text}"`);
            break;
        }
      }
      lines.push("");
    });

    return lines.join("\n").trim();
  }

  const groups = ir.groups ?? [];
  if (groups.length > 1) {
    const lines: string[] = [`Flow ${ir.direction === "LR" ? "LR" : "TB"}`, ""];
    groups.forEach((group, idx) => {
      const screenId = safeScreenId(group.id, idx + 1);
      const groupNodes = ir.nodes.filter((node) => node.groupId === group.id);
      lines.push(`Wireframe #${screenId} mobile`);
      lines.push("  Stack column gap=2");
      lines.push(`    Typography h4 "${cleanWiremarkText(group.label || group.id)}"`);
      for (const node of groupNodes) {
        const outgoing = ir.edges.find((edge) => edge.source === node.id);
        const targetNode = outgoing
          ? ir.nodes.find((entry) => entry.id === outgoing.target)
          : undefined;
        const targetGroup =
          targetNode?.groupId && targetNode.groupId !== group.id
            ? groups.find((g) => g.id === targetNode.groupId)
            : undefined;
        const toSuffix = targetGroup
          ? ` to=#${safeScreenId(targetGroup.id)}`
          : "";

        if (node.kind === "field") {
          lines.push(`    TextField "${cleanWiremarkText(node.label)}"`);
        } else if (node.kind === "task" || toSuffix) {
          lines.push(`    Button "${cleanWiremarkText(node.label)}" contained${toSuffix}`);
        } else {
          lines.push(`    Typography body1 "${cleanWiremarkText(node.label)}"`);
        }
      }
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  const title = ir.extras?.title || ir.groups?.[0]?.label || "Screen";
  const lines = [
    "Wireframe #screen mobile",
    "  Stack column gap=2",
    `    Typography h4 "${cleanWiremarkText(title)}"`,
  ];

  for (const node of ir.nodes) {
    const label = cleanWiremarkText(node.label || node.id);
    if (node.kind === "field") {
      lines.push(`    TextField "${label}"`);
    } else if (node.kind === "decision" || node.kind === "task") {
      lines.push(`    Button "${label}" contained`);
    } else {
      const outgoing = ir.edges.find((edge) => edge.source === node.id);
      if (outgoing) {
        lines.push(`    Button "${label}" variant=outlined`);
      } else {
        lines.push(`    TextField "${label}"`);
      }
    }
  }

  if (ir.nodes.length === 0) {
    lines.push('    Button "Continue" contained');
  }

  return lines.join("\n");
}
