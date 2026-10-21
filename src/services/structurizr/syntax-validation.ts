import { unwrapStructurizrSource } from "@shared/structurizr-source";
import {
  parseStructurizr,
  StructurizrParseError,
} from "@/services/structurizr/parse-dsl";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

export async function validateStructurizrSyntax(
  source: string,
): Promise<SyntaxCheckResult> {
  const prepared = unwrapStructurizrSource(source);
  if (!prepared) {
    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "syntax.issue.empty" }],
    };
  }

  try {
    parseStructurizr(prepared);
    return { valid: true, issues: [] };
  } catch (error) {
    if (error instanceof StructurizrParseError) {
      return {
        valid: false,
        issues: [
          {
            severity: "error",
            messageKey: error.messageKey,
            messageParams: error.messageParams,
            line: error.line,
          },
        ],
      };
    }

    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "structurizr.parseFailed" }],
    };
  }
}
