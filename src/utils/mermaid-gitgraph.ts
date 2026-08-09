const MERMAID_GIT_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function escapeMermaidGitRefQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Форматирует имя ветки/checkout/merge для Mermaid gitGraph. */
export function formatMermaidGitRef(value: string): string {
  if (MERMAID_GIT_REF_PATTERN.test(value)) {
    return value;
  }

  return `"${escapeMermaidGitRefQuoted(value)}"`;
}

/** Разбирает токен ветки из gitGraph (с кавычками или без). */
export function parseMermaidGitRefToken(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }

  return trimmed;
}
