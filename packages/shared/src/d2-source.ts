const D2_FENCE = /^```d2\b/i;
const D2_DIRECTION = /^\s*direction\s*:/im;
const D2_SHAPE_WITH_STRUCTURE = /^\s*shape\s*:/im;
const D2_CONNECTION = /->|<->|<-/;
const FENCED_D2_DOCUMENT =
  /^```d2[^\n]*\r?\n([\s\S]*?)\r?\n?```$/i;

export function looksLikeD2Source(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed) {
    return false;
  }

  if (D2_FENCE.test(trimmed)) {
    return true;
  }

  if (D2_DIRECTION.test(trimmed)) {
    return true;
  }

  return D2_SHAPE_WITH_STRUCTURE.test(trimmed) && D2_CONNECTION.test(trimmed);
}

export function unwrapD2Source(source: string): string {
  const trimmed = source.trim();
  const fenced = trimmed.match(FENCED_D2_DOCUMENT);
  return (fenced?.[1] ?? trimmed).trim();
}
