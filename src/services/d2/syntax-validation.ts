import { unwrapD2Source } from "@shared/d2-source";
import { renderD2ToSvg } from "@/services/d2/d2-engine";
import type { SyntaxCheckResult, SyntaxIssue } from "@/utils/plantuml-syntax";

const D2_ERROR_LINE = /:(\d+):\d+:\s*/;

interface D2CompilerDiagnostic {
  errmsg?: string;
}

function issueFromMessage(message: string): SyntaxIssue {
  const location = message.match(D2_ERROR_LINE);
  const cleaned = message.replace(/^index:\d+:\d+:\s*/, "");
  return {
    severity: "error",
    message: cleaned || message,
    line: location ? Number(location[1]) : undefined,
  };
}

export function issuesFromD2Error(error: unknown): SyntaxIssue[] {
  const message = error instanceof Error ? error.message : String(error);

  try {
    const parsed = JSON.parse(message) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => {
        if (typeof item === "object" && item && "errmsg" in item) {
          return issueFromMessage(
            String((item as D2CompilerDiagnostic).errmsg ?? message),
          );
        }
        return issueFromMessage(message);
      });
    }
  } catch {
    // Compiler messages are JSON when D2 reports diagnostics.
  }

  if (!message.trim()) {
    return [{ severity: "error", messageKey: "d2.parseFailed" }];
  }

  return [issueFromMessage(message)];
}

export async function validateD2Syntax(source: string): Promise<SyntaxCheckResult> {
  const prepared = unwrapD2Source(source);
  if (!prepared) {
    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "syntax.issue.empty" }],
    };
  }

  try {
    await renderD2ToSvg(prepared);
    return { valid: true, issues: [] };
  } catch (error) {
    return { valid: false, issues: issuesFromD2Error(error) };
  }
}
