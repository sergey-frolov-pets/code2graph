import type { SyntaxIssue } from "@/utils/plantuml-syntax";
import type { LocaleKey, TranslateFn } from "@/locales/types";

const SEVERITY_KEYS = {
  error: "syntax.severity.error",
  warning: "syntax.severity.warning",
} as const satisfies Record<string, LocaleKey>;

function severityLabel(
  severity: SyntaxIssue["severity"],
  t: TranslateFn,
): string {
  const key = SEVERITY_KEYS[severity as keyof typeof SEVERITY_KEYS];
  return key ? t(key) : severity;
}

export function localizeSyntaxIssue(
  issue: SyntaxIssue,
  t: TranslateFn,
): string {
  if (issue.messageKey) {
    const params = issue.messageParams
      ? Object.fromEntries(
          Object.entries(issue.messageParams).map(([key, value]) => [
            key,
            typeof value === "string" && value.startsWith("syntax.")
              ? t(value as LocaleKey)
              : value,
          ]),
        )
      : undefined;

    return t(issue.messageKey as LocaleKey, params);
  }

  return issue.message ?? "";
}

export function formatLocalizedSyntaxIssues(
  issues: SyntaxIssue[],
  t: TranslateFn,
): string {
  if (issues.length === 0) {
    return t("syntax.titleValid");
  }

  return issues
    .map((issue) => {
      const prefix = issue.line
        ? `${severityLabel(issue.severity, t)}: ${t("syntax.line", { line: issue.line })} `
        : `${severityLabel(issue.severity, t)}: `;
      return `${prefix}${localizeSyntaxIssue(issue, t)}`;
    })
    .join("\n");
}
