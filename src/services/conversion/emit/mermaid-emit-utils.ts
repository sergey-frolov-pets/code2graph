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

function needsQuotedMermaidLabelToken(value: string): boolean {
  return /[\s"']/.test(value) || /[^\x20-\x7E]/.test(value);
}

/** Форматирует текстовую метку в quadrantChart и других диаграммах Mermaid. */
export function formatMermaidLabelToken(value: string): string {
  const label = flattenMermaidLabel(value);
  if (!needsQuotedMermaidLabelToken(label)) {
    return label;
  }

  return `"${escapeMermaidQuoted(label)}"`;
}

/** Разбирает текстовую метку из исходника Mermaid. */
export function parseMermaidLabelToken(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }

  return trimmed;
}
