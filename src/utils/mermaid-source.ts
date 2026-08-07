export function prepareMermaidSource(source: string): string {
  const trimmed = source.trim();
  const fencedMatch = trimmed.match(/^```(?:mermaid)?\s*\n([\s\S]*?)```$/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}
