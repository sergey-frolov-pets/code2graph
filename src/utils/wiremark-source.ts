const FENCED_WIREMARK =
  /^```(?:wireframe|wiremark)\s*\r?\n([\s\S]*?)\r?\n?```$/i;

const WIREMARK_ROOT = /^(?:wireframe|flow|icons)\b/i;

export function unwrapWiremarkSource(source: string): string {
  const trimmed = source.trim();
  const fenced = trimmed.match(FENCED_WIREMARK);
  if (fenced?.[1]) {
    return fenced[1].replace(/\s+$/, "");
  }

  return trimmed;
}

function firstSignificantLine(source: string): string {
  for (const line of unwrapWiremarkSource(source).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      continue;
    }
    return trimmed;
  }

  return "";
}

export function looksLikeWiremarkSource(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed) {
    return false;
  }

  if (/^```(?:wireframe|wiremark)\b/i.test(trimmed)) {
    return true;
  }

  return WIREMARK_ROOT.test(firstSignificantLine(trimmed));
}

export function isCompleteWiremarkDocument(source: string): boolean {
  return /^\s*Wireframe\b/m.test(unwrapWiremarkSource(source));
}
