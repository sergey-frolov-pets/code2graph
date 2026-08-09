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

/** Mermaid architecture-beta bracket labels are ASCII-only (v11.x). */
export function sanitizeMermaidArchitectureLabel(value: string): string {
  const label = flattenMermaidLabel(value);
  if (!/[^\x20-\x7E]/.test(label)) {
    return label;
  }

  const transliterated = label.replace(/Компонент\s*(\d+)/gi, "Komponent $1");
  if (!/[^\x20-\x7E]/.test(transliterated)) {
    return transliterated;
  }

  return label.replace(/[^\x20-\x7E]/g, "").trim() || "Service";
}

/** Normalizes architecture service ids to ASCII identifiers accepted by Mermaid. */
export function toMermaidArchitectureServiceId(
  value: string,
  fallbackIndex?: number,
): string {
  const sanitized = sanitizeMermaidArchitectureLabel(value)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (sanitized) {
    return sanitized;
  }

  return fallbackIndex !== undefined ? `service_${fallbackIndex}` : "service";
}

function needsQuotedMermaidSankeyCsvField(value: string): boolean {
  return /[,"\s]/.test(value) || /[^\x20-\x7E]/.test(value);
}

function escapeMermaidSankeyCsvField(value: string): string {
  return flattenMermaidLabel(value).replace(/"/g, '""');
}

/** Форматирует поле CSV для Mermaid sankey-beta (RFC 4180). */
export function formatMermaidSankeyCsvField(value: string): string {
  const label = flattenMermaidLabel(value);
  if (!needsQuotedMermaidSankeyCsvField(label)) {
    return label;
  }

  return `"${escapeMermaidSankeyCsvField(label)}"`;
}

/** Разбирает строку sankey-beta: source,target,value */
export function parseMermaidSankeyCsvLine(
  line: string,
): { source: string; target: string; value: number } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("%%")) {
    return null;
  }

  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (inQuotes) {
      if (char === '"' && trimmed[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  if (fields.length !== 3) {
    return null;
  }

  const value = Number.parseFloat(fields[2].trim());
  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    source: fields[0].trim(),
    target: fields[1].trim(),
    value,
  };
}
