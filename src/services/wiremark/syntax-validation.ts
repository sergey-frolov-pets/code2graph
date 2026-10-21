import { render, WiremarkError, type WiremarkDiagnostic } from "@wiremark/core";
import type { SyntaxCheckResult, SyntaxIssue } from "@/utils/plantuml-syntax";
import { unwrapWiremarkSource } from "@/utils/wiremark-source";

function diagnosticToIssue(diagnostic: WiremarkDiagnostic): SyntaxIssue {
  return {
    severity: diagnostic.severity === "error" ? "error" : "warning",
    message: diagnostic.message,
    line: diagnostic.loc?.line,
  };
}

export function validateWiremarkSyntax(source: string): SyntaxCheckResult {
  const unwrapped = unwrapWiremarkSource(source);
  if (!unwrapped.trim()) {
    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "syntax.issue.empty" }],
    };
  }

  try {
    const { diagnostics } = render(unwrapped, { theme: "light" });
    const issues = diagnostics.map(diagnosticToIssue);
    const hasError = issues.some((issue) => issue.severity === "error");
    return { valid: !hasError, issues };
  } catch (error) {
    if (error instanceof WiremarkError) {
      return {
        valid: false,
        issues: [
          {
            severity: "error",
            message: error.message,
            line: error.loc?.line,
          },
        ],
      };
    }

    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "wiremark.parseFailed" }],
    };
  }
}
