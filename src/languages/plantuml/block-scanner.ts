export const PLANTUML_SEQUENCE_BLOCK_KINDS = new Set([
  "alt",
  "loop",
  "opt",
  "par",
  "group",
  "critical",
  "break",
]);

export function stripPlantUmlLineComment(line: string): string {
  let inString = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (char === "'" && !inString) {
      return line.slice(0, index);
    }
  }

  return line;
}

export function startsPlantUmlBlock(trimmedLine: string, keyword: string): boolean {
  return (
    trimmedLine === keyword ||
    trimmedLine.startsWith(`${keyword} `) ||
    trimmedLine.startsWith(`${keyword}(`)
  );
}
