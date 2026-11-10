import type { DiagramNodeShape } from "@/services/conversion/diagram-ir";

const DECISION_STEREOTYPE = " <<decision>>";

export function flattenPlantUmlLabel(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapePlantUmlQuoted(value: string): string {
  return flattenPlantUmlLabel(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

export function needsQuotedPlantUmlComponentLabel(rawLabel: string): boolean {
  if (/[\r\n]/.test(rawLabel)) {
    return true;
  }

  const label = flattenPlantUmlLabel(rawLabel);
  if (!label) {
    return true;
  }

  return /[[\]"]/.test(label);
}

function plantUmlNodeKeyword(shape: DiagramNodeShape | undefined): {
  keyword: string;
  stereotype: string;
} {
  switch (shape) {
    case "ellipse":
      return { keyword: "usecase", stereotype: "" };
    case "hexagon":
      return { keyword: "hexagon", stereotype: "" };
    case "parallelogram":
    case "trapezoid":
      return { keyword: "card", stereotype: "" };
    case "diamond":
      return { keyword: "rectangle", stereotype: DECISION_STEREOTYPE };
    default:
      return { keyword: "rectangle", stereotype: "" };
  }
}

export function emitPlantUmlComponentNode(
  id: string,
  rawLabel: string,
  fill?: string,
  shape?: DiagramNodeShape,
): string {
  const label = flattenPlantUmlLabel(rawLabel) || "node";
  const color = fill?.trim() ? ` ${fill.trim().startsWith("#") ? fill.trim() : `#${fill.trim()}`}` : "";
  const { keyword, stereotype } = plantUmlNodeKeyword(shape);
  const shaped = shape !== undefined && shape !== "rect" && shape !== "round";

  if (shaped || needsQuotedPlantUmlComponentLabel(rawLabel)) {
    return `${keyword} "${escapePlantUmlQuoted(label)}" as ${id}${stereotype}${color}`;
  }

  return `[${label}] as ${id}${color}`;
}

export function formatPlantUmlEdgeSuffix(rawLabel: string | undefined): string {
  if (!rawLabel?.trim()) {
    return "";
  }

  return ` : ${escapePlantUmlQuoted(rawLabel)}`;
}

export function formatPlantUmlActivityLabel(rawLabel: string): string {
  return flattenPlantUmlLabel(rawLabel).replace(/;/g, ",");
}
