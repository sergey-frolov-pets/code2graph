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

export function emitPlantUmlComponentNode(id: string, rawLabel: string): string {
  const label = flattenPlantUmlLabel(rawLabel) || "node";

  if (needsQuotedPlantUmlComponentLabel(rawLabel)) {
    return `rectangle "${escapePlantUmlQuoted(label)}" as ${id}`;
  }

  return `[${label}] as ${id}`;
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
