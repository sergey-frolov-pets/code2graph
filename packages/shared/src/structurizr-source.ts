const STRUCTURIZR_FENCE = /^```(?:structurizr|dsl)\b/i;
const FENCED_STRUCTURIZR_DOCUMENT =
  /^```(?:structurizr|dsl)[^\n]*\r?\n([\s\S]*?)\r?\n?```$/i;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /\/\/[^\n]*/g;

export function looksLikeStructurizrSource(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed) {
    return false;
  }

  if (STRUCTURIZR_FENCE.test(trimmed)) {
    return true;
  }

  const withoutComments = trimmed
    .replace(BLOCK_COMMENT, " ")
    .replace(LINE_COMMENT, " ")
    .trim();
  return /^workspace\b/.test(withoutComments);
}

export function unwrapStructurizrSource(source: string): string {
  const trimmed = source.trim();
  const fenced = trimmed.match(FENCED_STRUCTURIZR_DOCUMENT);
  return (fenced?.[1] ?? trimmed).trim();
}
