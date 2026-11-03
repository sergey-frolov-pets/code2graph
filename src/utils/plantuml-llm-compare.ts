export function normalizePlantUmlForCompare(source: string): string {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function plantUmlSourcesEqual(left: string, right: string): boolean {
  return normalizePlantUmlForCompare(left) === normalizePlantUmlForCompare(right);
}
