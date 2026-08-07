export type SyntaxIssueSeverity = "error" | "warning";

export interface SyntaxIssue {
  severity: SyntaxIssueSeverity;
  message?: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  line?: number;
}

export interface SyntaxCheckResult {
  valid: boolean;
  issues: SyntaxIssue[];
}

const START_MARKERS = [
  "@startuml",
  "@startmindmap",
  "@startgantt",
  "@startwbs",
  "@startjson",
  "@startyaml",
  "@startditaa",
  "@startsalt",
  "@startdot",
  "@startchen",
  "@startnwdiag",
  "@startchronology",
  "@startebnf",
  "@startregex",
  "@startboard",
  "@startmath",
  "@startlatex",
] as const;

const END_MARKERS = [
  "@enduml",
  "@endmindmap",
  "@endgantt",
  "@endwbs",
  "@endjson",
  "@endyaml",
  "@endditaa",
  "@endsalt",
  "@enddot",
  "@endchen",
  "@endnwdiag",
  "@endchronology",
  "@endebnf",
  "@endregex",
  "@endboard",
  "@endmath",
  "@endlatex",
] as const;

function findMarkerLine(lines: string[], markers: readonly string[]): number | null {
  for (let index = 0; index < lines.length; index += 1) {
    const normalized = lines[index].trim().toLowerCase();
    if (markers.some((marker) => normalized.startsWith(marker))) {
      return index + 1;
    }
  }
  return null;
}

function bracketDetailKey(count: number, missingCloseKey: string, extraCloseKey: string): string {
  return count > 0 ? missingCloseKey : extraCloseKey;
}

function countUnbalancedBrackets(source: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  let round = 0;
  let square = 0;
  let curly = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;

    if (round < 0 || square < 0 || curly < 0) {
      issues.push({
        severity: "error",
        messageKey: "syntax.issue.unbalanced",
      });
      return issues;
    }
  }

  if (round !== 0) {
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.unbalancedRound",
      messageParams: {
        detail: bracketDetailKey(
          round,
          "syntax.issue.roundMissingClose",
          "syntax.issue.roundExtraClose",
        ),
      },
    });
  }
  if (square !== 0) {
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.unbalancedSquare",
      messageParams: {
        detail: bracketDetailKey(
          square,
          "syntax.issue.squareMissingClose",
          "syntax.issue.squareExtraClose",
        ),
      },
    });
  }
  if (curly !== 0) {
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.unbalancedCurly",
      messageParams: {
        detail: bracketDetailKey(
          curly,
          "syntax.issue.curlyMissingClose",
          "syntax.issue.curlyExtraClose",
        ),
      },
    });
  }

  return issues;
}

/** Быстрая статическая проверка без запуска движка PlantUML */
export function getPlantUmlStartMarker(source: string): string | null {
  const trimmed = source.trim().toLowerCase();

  for (const marker of START_MARKERS) {
    if (trimmed.startsWith(marker)) {
      return marker;
    }
  }

  return null;
}

export function usesStandalonePlantUmlStarter(source: string): boolean {
  const marker = getPlantUmlStartMarker(source);
  return marker !== null && marker !== "@startuml";
}

export function checkPlantUmlSyntax(source: string): SyntaxCheckResult {
  const trimmed = source.trim();
  const issues: SyntaxIssue[] = [];

  if (!trimmed) {
    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "syntax.issue.empty" }],
    };
  }

  const lines = source.split(/\r?\n/);
  const startLine = findMarkerLine(lines, START_MARKERS);
  const endLine = findMarkerLine(lines, END_MARKERS);

  if (!startLine) {
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.missingStart",
      line: 1,
    });
  }

  if (!endLine) {
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.missingEnd",
    });
  }

  if (startLine && endLine && endLine < startLine) {
    issues.push({
      severity: "error",
      messageKey: "syntax.issue.endBeforeStart",
      line: endLine,
    });
  }

  issues.push(...countUnbalancedBrackets(source));

  const errors = issues.filter((issue) => issue.severity === "error");
  return {
    valid: errors.length === 0,
    issues,
  };
}

const ENGINE_ERROR_LINE_PATTERNS = [
  /\[From[^\]]*\(line\s+(\d+)\)/i,
  /\(line\s+(\d+)\)/i,
  /line\s+(\d+)/i,
] as const;

export function parsePlantUmlErrorLine(message: string): number | undefined {
  for (const pattern of ENGINE_ERROR_LINE_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const line = Number.parseInt(match[1], 10);
      if (Number.isFinite(line) && line > 0) {
        return line;
      }
    }
  }
  return undefined;
}

export function isPlantUmlErrorSvg(svg: string): boolean {
  return (
    svg.includes("Syntax Error") ||
    svg.includes("An error has occurred") ||
    svg.includes("has crashed")
  );
}

export function parsePlantUmlErrorFromSvg(svg: string): SyntaxIssue[] {
  const line = parsePlantUmlErrorLine(svg);
  const messageMatch = svg.match(/Syntax Error\?[^<]*/);
  const message = messageMatch?.[0].trim();

  return [
    {
      severity: "error",
      message: message || undefined,
      messageKey: message ? undefined : "syntax.issue.engineError",
      line,
    },
  ];
}
