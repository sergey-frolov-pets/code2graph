import { parseGraphml } from "@/services/graphml/graphml-engine";
import { LocalizedAppError } from "@/utils/localized-app-error";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

function extractParserErrorLine(parserError: Element): number | undefined {
  const text = parserError.textContent ?? "";
  const match = text.match(/line\s+(\d+)/i);
  if (!match) {
    return undefined;
  }

  const line = Number.parseInt(match[1], 10);
  return Number.isFinite(line) ? line : undefined;
}

export function validateGraphmlSyntax(source: string): SyntaxCheckResult {
  const trimmed = source.trim();
  if (!trimmed) {
    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "syntax.issue.empty" }],
    };
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(trimmed, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    return {
      valid: false,
      issues: [
        {
          severity: "error",
          messageKey: "graphml.parseFailed",
          line: extractParserErrorLine(parserError),
        },
      ],
    };
  }

  try {
    parseGraphml(trimmed);
    return { valid: true, issues: [] };
  } catch (error) {
    if (error instanceof LocalizedAppError) {
      return {
        valid: false,
        issues: [
          {
            severity: "error",
            messageKey: error.messageKey,
            messageParams: error.messageParams,
          },
        ],
      };
    }

    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "graphml.parseFailed" }],
    };
  }
}
