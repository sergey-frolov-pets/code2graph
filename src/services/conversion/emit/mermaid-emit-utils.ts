export function flattenMermaidLabel(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeMermaidQuoted(value: string): string {
  return flattenMermaidLabel(value).replace(/"/g, '\\"');
}

export function needsQuotedMermaidNodeLabel(rawLabel: string): boolean {
  if (/[\r\n]/.test(rawLabel)) {
    return true;
  }

  const label = flattenMermaidLabel(rawLabel);
  if (!label) {
    return true;
  }

  return /[[\](){}"|]/.test(label);
}

export function formatMermaidNodeLabel(rawLabel: string): string {
  const label = flattenMermaidLabel(rawLabel) || "node";

  if (needsQuotedMermaidNodeLabel(rawLabel)) {
    return `["${escapeMermaidQuoted(label)}"]`;
  }

  return `[${label}]`;
}

function needsQuotedMermaidRequirementText(value: string): boolean {
  return /[\s"']/.test(value) || /[^\x20-\x7E]/.test(value);
}

/** Форматирует значение поля text в requirementDiagram. */
export function formatMermaidRequirementText(value: string): string {
  const label = flattenMermaidLabel(value);
  if (!needsQuotedMermaidRequirementText(label)) {
    return label;
  }

  return `"${escapeMermaidQuoted(label)}"`;
}

/** Разбирает значение поля text из requirementDiagram. */
export function parseMermaidRequirementText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }

  return trimmed;
}
