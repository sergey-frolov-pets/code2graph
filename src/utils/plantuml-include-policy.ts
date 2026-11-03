const INCLUDE_LINE_PATTERN =
  /^\s*!include(?:_once|url)?(?:\s+many)?\s+(.+?)\s*$/;

const ALLOWED_INCLUDE_PREFIX = "./plantuml-lib/";
const STDLIB_INCLUDE_PATTERN = /^<[^>]+>$/;

function stripIncludeQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export type IncludePolicyIssue = {
  line: number;
  message: string;
  includePath: string;
};

export function checkPlantUmlIncludePolicy(source: string): IncludePolicyIssue[] {
  const issues: IncludePolicyIssue[] = [];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = INCLUDE_LINE_PATTERN.exec(line);
    if (!match) {
      continue;
    }

    const includePath = stripIncludeQuotes(match[1]);
    const lineNumber = index + 1;

    if (/^https?:\/\//i.test(includePath)) {
      issues.push({
        line: lineNumber,
        message: "External !include URLs are not allowed in LLM output",
        includePath,
      });
      continue;
    }

    if (line.includes("!includeurl") || line.includes("!include_url")) {
      issues.push({
        line: lineNumber,
        message: "!includeurl is not allowed in LLM output",
        includePath,
      });
      continue;
    }

    if (includePath.startsWith(ALLOWED_INCLUDE_PREFIX)) {
      continue;
    }

    if (STDLIB_INCLUDE_PATTERN.test(includePath)) {
      continue;
    }

    issues.push({
      line: lineNumber,
      message: "Only ./plantuml-lib/ or stdlib <...> includes are allowed",
      includePath,
    });
  }

  return issues;
}
