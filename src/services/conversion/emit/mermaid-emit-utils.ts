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
