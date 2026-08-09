import { countUnbalancedBrackets, type SyntaxCheckResult, type SyntaxIssue } from "@/utils/plantuml-syntax";

const MERMAID_DIAGRAM_DECLARATION_PATTERN =
  /^(graph|flowchart|sequencediagram|classdiagram|statediagram(?:-v2)?|erdiagram|journey|gantt|pie|mindmap|timeline|gitgraph|sankey-beta|xychart-beta|block-beta|c4context|requirementdiagram|quadrantchart|architecture(?:-beta)?|packet(?:-beta)?)\b/i;

const FENCED_MERMAID_START_PATTERN = /^```mermaid\b/i;

function findFirstMeaningfulLine(lines: string[]): { line: number; text: string } | null {
  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index].trim();
    if (!text || text.startsWith("%%")) {
      continue;
    }

    return { line: index + 1, text };
  }

  return null;
}

function checkFencedMermaidBlock(source: string): SyntaxIssue[] {
  const trimmed = source.trim();
  if (!trimmed.startsWith("```")) {
    return [];
  }

  const issues: SyntaxIssue[] = [];
  if (!FENCED_MERMAID_START_PATTERN.test(trimmed)) {
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.mermaid.fencedType",
      line: 1,
    });
  }

  if (!trimmed.endsWith("```") || trimmed === "```" || trimmed === "```mermaid") {
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.mermaid.unclosedFence",
      line: 1,
    });
  }

  return issues;
}

function hasMermaidDiagramDeclaration(source: string): boolean {
  const lines = source.split(/\r?\n/);
  const firstMeaningful = findFirstMeaningfulLine(lines);
  if (!firstMeaningful) {
    return false;
  }

  return MERMAID_DIAGRAM_DECLARATION_PATTERN.test(firstMeaningful.text);
}

/** Быстрая статическая проверка без запуска движка Mermaid */
export function checkMermaidSyntax(source: string): SyntaxCheckResult {
  const trimmed = source.trim();
  const issues: SyntaxIssue[] = [];

  if (!trimmed) {
    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "syntax.issue.empty" }],
    };
  }

  issues.push(...checkFencedMermaidBlock(trimmed));

  const prepared = trimmed.startsWith("```")
    ? trimmed.match(/^```(?:mermaid)?\s*\n([\s\S]*?)```$/i)?.[1]?.trim() ?? trimmed
    : trimmed;

  if (!hasMermaidDiagramDeclaration(prepared)) {
    const firstMeaningful = findFirstMeaningfulLine(prepared.split(/\r?\n/));
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.mermaid.missingDeclaration",
      line: firstMeaningful?.line ?? 1,
    });
  }

  issues.push(...countUnbalancedBrackets(prepared));

  const errors = issues.filter((issue) => issue.severity === "error");
  return {
    valid: errors.length === 0,
    issues,
  };
}

export function parseMermaidErrorLine(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const hash = (
      error as {
        hash?: { line?: number; loc?: { first_line?: number } };
      }
    ).hash;

    if (typeof hash?.line === "number" && hash.line > 0) {
      return hash.line;
    }

    if (typeof hash?.loc?.first_line === "number" && hash.loc.first_line > 0) {
      return hash.loc.first_line;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const lineMatch = message.match(/on line (\d+)/i) ?? message.match(/line\s+(\d+)/i);
  if (lineMatch?.[1]) {
    const line = Number.parseInt(lineMatch[1], 10);
    if (Number.isFinite(line) && line > 0) {
      return line;
    }
  }

  return undefined;
}

export function parseMermaidErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return undefined;
}
